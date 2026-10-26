import { PARTICLE_ORDER } from "../../lib/particles"
import type {
  CrystalAction,
  CrystalCost,
  CrystalData,
  CrystalGuideStep,
  CrystalInputState,
  CrystalLevels,
  CrystalRecommendation,
  CrystalTargetLevel,
  CrystalUpgrade,
} from "./crystalTypes"

export const ERM_GROUP_ID = "erm"
export const ERM_UPGRADE_IDS = [
  "special.bulkExtractions",
  "special.bulkResearches",
  "special.bulkDcMilestones",
] as const

// Fraction of a target's span bought per recommended action.
const CHUNK_FRACTION = 0.1
const MAX_PREREQUISITE_DEPTH = 5
const MAX_SIMULATED_ACTIONS = 1000

type Candidate = {
  upgrade: CrystalUpgrade
  goal: number
  base: number
  // Set for prerequisites: they rank by the progress of the upgrade that needs them.
  rankRatio?: number
}

export const levelOf = (levels: CrystalLevels, id: string) => levels[id] ?? 0

const particleRank = (particle: string) => PARTICLE_ORDER.indexOf(particle as (typeof PARTICLE_ORDER)[number])

export const isUpgradeUnlocked = (upgrade: CrystalUpgrade, state: CrystalInputState) => {
  const { particle, se, playerLevel } = upgrade.requires
  if (particle && particleRank(particle) > particleRank(state.unlockedParticle)) return false
  if (se !== undefined && state.se < se) return false
  if (playerLevel !== undefined && state.playerLevel < playerLevel) return false
  return true
}

export const isStepActive = (step: CrystalGuideStep, se: number) =>
  (step.minSe === undefined || se >= step.minSe) && (step.maxSe === undefined || se <= step.maxSe)

export const calculateUpgradeCost = (upgrade: CrystalUpgrade, from: number, to: number): CrystalCost => {
  const count = Math.max(0, to - from)
  if (count === 0) return { cost: 0, unknown: false }
  if (upgrade.baseCost === null) return { cost: 0, unknown: true }

  const stepTotal = (upgrade.costStep * (from + to - 1) * count) / 2
  return { cost: upgrade.baseCost * count + stepTotal, unknown: false }
}

const addCost = (a: CrystalCost, b: CrystalCost): CrystalCost => ({
  cost: a.cost + b.cost,
  unknown: a.unknown || b.unknown,
})

const NO_COST: CrystalCost = { cost: 0, unknown: false }

export const calculateCrystalsSpent = (levels: CrystalLevels, data: CrystalData): CrystalCost =>
  data.upgrades.reduce(
    (sum, upgrade) =>
      addCost(sum, calculateUpgradeCost(upgrade, 0, Math.min(upgrade.maxLevel, levelOf(levels, upgrade.id)))),
    NO_COST,
  )

const resolveGoal = (upgrade: CrystalUpgrade, level: CrystalTargetLevel) =>
  Math.min(upgrade.maxLevel, level === "max" ? upgrade.maxLevel : Math.max(0, Math.floor(level)))

const expandTargets = (step: CrystalGuideStep) =>
  step.targets.flatMap((target) =>
    target.id === ERM_GROUP_ID ? ERM_UPGRADE_IDS.map((id) => ({ id, level: target.level })) : [target],
  )

// Follows unmet prerequisites to the upgrade that actually has to be bought next; null when locked.
const resolveCandidate = (
  id: string,
  level: CrystalTargetLevel,
  state: CrystalInputState,
  upgradeById: Map<string, CrystalUpgrade>,
  previousGoals: Map<string, number>,
  depth = 0,
  rankRatio?: number,
): Candidate | null => {
  const upgrade = upgradeById.get(id)
  if (!upgrade || depth > MAX_PREREQUISITE_DEPTH || !isUpgradeUnlocked(upgrade, state)) return null

  const goal = resolveGoal(upgrade, level)
  const current = levelOf(state.levels, id)
  if (current >= goal) return null

  const candidate: Candidate = { upgrade, goal, base: Math.min(previousGoals.get(id) ?? 0, current), rankRatio }
  const ownRatio = rankRatio ?? progressRatio(candidate, current)

  for (const prerequisite of upgrade.requires.upgrades) {
    if (levelOf(state.levels, prerequisite.id) < prerequisite.level) {
      return resolveCandidate(
        prerequisite.id,
        prerequisite.level,
        state,
        upgradeById,
        previousGoals,
        depth + 1,
        ownRatio,
      )
    }
  }

  return candidate
}

const chunkSize = (candidate: Candidate) => Math.max(1, Math.ceil((candidate.goal - candidate.base) * CHUNK_FRACTION))

// Chunk boundaries are fixed from the base, so buying single levels does not move the target or ranking.
const chunkStart = (candidate: Candidate, current: number) => {
  const chunk = chunkSize(candidate)
  return candidate.base + Math.floor((current - candidate.base) / chunk) * chunk
}

const progressRatio = (candidate: Candidate, current: number) => {
  const span = candidate.goal - candidate.base
  return span <= 0 ? 0 : (chunkStart(candidate, current) - candidate.base) / span
}

const findCurrentStep = (state: CrystalInputState, data: CrystalData) => {
  const upgradeById = new Map(data.upgrades.map((upgrade) => [upgrade.id, upgrade] as const))
  const previousGoals = new Map<string, number>()

  for (let index = 0; index < data.steps.length; index++) {
    const step = data.steps[index]
    if (!isStepActive(step, state.se)) continue

    const targets = expandTargets(step)
    const candidates = new Map<string, Candidate>()
    for (const target of targets) {
      const candidate = resolveCandidate(target.id, target.level, state, upgradeById, previousGoals)
      if (candidate && !candidates.has(candidate.upgrade.id)) candidates.set(candidate.upgrade.id, candidate)
    }

    if (candidates.size > 0) return { step, index, candidates: [...candidates.values()], upgradeById }

    for (const target of targets) {
      const upgrade = upgradeById.get(target.id)
      if (!upgrade) continue
      previousGoals.set(target.id, Math.max(previousGoals.get(target.id) ?? 0, resolveGoal(upgrade, target.level)))
    }
  }

  return null
}

const toAction = (candidate: Candidate, current: number, stepId: string): CrystalAction => {
  const targetLevel = Math.min(candidate.goal, chunkStart(candidate, current) + chunkSize(candidate))

  return {
    id: candidate.upgrade.id,
    name: candidate.upgrade.name,
    currentLevel: current,
    targetLevel,
    maxLevel: candidate.upgrade.maxLevel,
    cost: calculateUpgradeCost(candidate.upgrade, current, targetLevel),
    stepId,
  }
}

const pickNextAction = (state: CrystalInputState, data: CrystalData) => {
  const found = findCurrentStep(state, data)
  if (!found) return null

  let best: { candidate: Candidate; ratio: number } | null = null
  for (const candidate of found.candidates) {
    const ratio = candidate.rankRatio ?? progressRatio(candidate, levelOf(state.levels, candidate.upgrade.id))
    if (!best || ratio < best.ratio) best = { candidate, ratio }
  }

  if (!best) return null
  return {
    found,
    action: toAction(best.candidate, levelOf(state.levels, best.candidate.upgrade.id), found.step.id),
  }
}

export const calculateCrystalRecommendations = (
  state: CrystalInputState,
  data: CrystalData,
  count: number,
): CrystalRecommendation => {
  const first = findCurrentStep(state, data)

  const actions: CrystalAction[] = []
  let levels = state.levels
  for (let i = 0; i < MAX_SIMULATED_ACTIONS && actions.length <= count; i++) {
    const next = pickNextAction({ ...state, levels }, data)
    if (!next) break

    // Consecutive chunks of the same upgrade are shown as one row.
    const last = actions[actions.length - 1]
    if (last && last.id === next.action.id) {
      last.targetLevel = next.action.targetLevel
      last.cost = addCost(last.cost, next.action.cost)
    } else {
      actions.push({ ...next.action })
    }
    levels = { ...levels, [next.action.id]: next.action.targetLevel }
  }

  return { actions: actions.slice(0, count), step: first?.step ?? null, stepIndex: first?.index ?? -1 }
}

// Levels after buying the next `count` actions, or the rest of the current step when count is "step".
export const applyCrystalActions = (
  state: CrystalInputState,
  data: CrystalData,
  count: number | "step",
): CrystalLevels => {
  let levels = state.levels
  const stepId = count === "step" ? calculateCrystalRecommendations(state, data, 1).step?.id : null
  const limit = count === "step" ? 100000 : count

  for (let i = 0; i < limit; i++) {
    const next = pickNextAction({ ...state, levels }, data)
    if (!next) break
    if (stepId && next.action.stepId !== stepId) break
    levels = { ...levels, [next.action.id]: next.action.targetLevel }
  }

  return levels
}
