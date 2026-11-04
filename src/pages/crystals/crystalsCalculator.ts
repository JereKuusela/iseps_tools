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
} from "./crystalsTypes"

export const ERM_GROUP_ID = "erm"
export const ERM_UPGRADE_IDS = [
  "special.bulkExtractions",
  "special.bulkResearches",
  "special.bulkDcMilestones",
] as const

// Fraction of a target's span bought per recommended action.
const CHUNK_FRACTION = 0.1
const MAX_SIMULATED_ACTIONS = 1000

type Candidate = {
  upgrade: CrystalUpgrade
  goal: number
  base: number
  // Set for prerequisites: they rank by the progress of the upgrade that needs them.
  rankRatio?: number
}

type PreparedCrystalData = {
  steps: CrystalGuideStep[]
  upgradeById: Map<string, CrystalUpgrade>
}

export const levelOf = (levels: CrystalLevels, id: string) => levels[id] ?? 0

const particleRank = (particle: string) => PARTICLE_ORDER.indexOf(particle as (typeof PARTICLE_ORDER)[number])

export const isUpgradeUnlocked = (upgrade: CrystalUpgrade, state: CrystalInputState): boolean =>
  upgrade.fullRequires.every(
    ({ particle, se, playerLevel }) =>
      (!particle || particleRank(particle) <= particleRank(state.unlockedParticle)) &&
      (se === undefined || state.se >= se) &&
      (playerLevel === undefined || state.playerLevel >= playerLevel),
  )

export const isStepActive = (step: CrystalGuideStep, se: number) =>
  (step.minSe === undefined || se >= step.minSe) && (step.maxSe === undefined || se <= step.maxSe)

export const calculateUpgradeCost = (upgrade: CrystalUpgrade, from: number, to: number): CrystalCost => {
  const count = Math.max(0, to - from)
  if (count === 0) return { cost: 0, unknown: false }
  if (upgrade.costs) return { cost: upgrade.costs.slice(from, to).reduce((sum, cost) => sum + cost, 0), unknown: false }
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

// Finds the first unmet prerequisite in dependency order; null when locked or complete.
const resolveCandidate = (
  id: string,
  level: CrystalTargetLevel,
  state: CrystalInputState,
  upgradeById: Map<string, CrystalUpgrade>,
  previousGoals: Map<string, number>,
): Candidate | null => {
  const upgrade = upgradeById.get(id)
  if (!upgrade || !isUpgradeUnlocked(upgrade, state)) return null

  const goal = resolveGoal(upgrade, level)
  const current = levelOf(state.levels, id)
  if (current >= goal) return null

  const candidate: Candidate = { upgrade, goal, base: Math.min(previousGoals.get(id) ?? 0, current) }

  for (const requirements of upgrade.fullRequires) {
    for (const prerequisite of requirements.upgrades) {
      const prerequisiteLevel = levelOf(state.levels, prerequisite.id)
      if (prerequisiteLevel >= prerequisite.level) continue
      const required = upgradeById.get(prerequisite.id)
      if (!required) return null
      const prerequisiteGoal = resolveGoal(required, prerequisite.level)
      if (prerequisiteLevel >= prerequisiteGoal) return null
      return {
        upgrade: required,
        goal: prerequisiteGoal,
        base: Math.min(previousGoals.get(prerequisite.id) ?? 0, prerequisiteLevel),
        rankRatio: progressRatio(candidate, current),
      }
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

const findCurrentStep = (state: CrystalInputState, data: PreparedCrystalData) => {
  const { upgradeById } = data
  const previousGoals = new Map<string, number>()

  for (let index = 0; index < data.steps.length; index++) {
    const step = data.steps[index]
    if (!isStepActive(step, state.se)) continue

    const targets = step.targets
    const candidates = new Map<string, Candidate>()
    for (const target of targets) {
      const candidate = resolveCandidate(target.id, target.level, state, upgradeById, previousGoals)
      if (candidate && !candidates.has(candidate.upgrade.id)) candidates.set(candidate.upgrade.id, candidate)
    }

    if (candidates.size > 0) return { step, index, candidates: [...candidates.values()] }

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

const pickNextAction = (state: CrystalInputState, found: ReturnType<typeof findCurrentStep>) => {
  if (!found) return null

  let best: { candidate: Candidate; ratio: number } | null = null
  for (const candidate of found.candidates) {
    const ratio = candidate.rankRatio ?? progressRatio(candidate, levelOf(state.levels, candidate.upgrade.id))
    if (!best || ratio < best.ratio) best = { candidate, ratio }
  }

  if (!best) return null
  return toAction(best.candidate, levelOf(state.levels, best.candidate.upgrade.id), found.step.id)
}

// Locked upgrades the user should save for: those in or before the current step, plus the next fully blocked step.
const findSavingGoals = (state: CrystalInputState, data: PreparedCrystalData, currentIndex: number) => {
  const { upgradeById } = data
  const lockedGoals = new Map<string, number>()

  for (let index = 0; index < data.steps.length; index++) {
    const step = data.steps[index]
    if (!isStepActive(step, state.se)) continue

    let hasActionable = false
    const stepLocked: [string, number][] = []
    for (const target of step.targets) {
      const upgrade = upgradeById.get(target.id)
      if (!upgrade) continue
      const goal = resolveGoal(upgrade, target.level)
      if (levelOf(state.levels, target.id) >= goal) continue

      if (resolveCandidate(target.id, target.level, state, upgradeById, new Map())) hasActionable = true
      else stepLocked.push([target.id, goal])
    }

    const fullyBlocked = !hasActionable && stepLocked.length > 0
    if (index > currentIndex && !fullyBlocked) continue

    for (const [id, goal] of stepLocked) lockedGoals.set(id, Math.max(lockedGoals.get(id) ?? 0, goal))
    if (index > currentIndex) break
  }

  const names: string[] = []
  let cost = NO_COST
  for (const [id, goal] of lockedGoals) {
    const upgrade = upgradeById.get(id)
    if (!upgrade) continue
    names.push(upgrade.name)
    cost = addCost(cost, calculateUpgradeCost(upgrade, levelOf(state.levels, id), goal))
  }

  return { names, cost }
}

const findDoneNotes = (state: CrystalInputState, data: PreparedCrystalData) => {
  const { upgradeById } = data

  return data.steps.flatMap((step) => {
    if (!step.doneNote || !isStepActive(step, state.se)) return []
    const isDone = step.targets.every((target) => {
      const upgrade = upgradeById.get(target.id)
      return !upgrade || levelOf(state.levels, target.id) >= resolveGoal(upgrade, target.level)
    })
    return isDone ? [step.doneNote] : []
  })
}

export const calculateCrystalRecommendations = (
  state: CrystalInputState,
  data: CrystalData,
  count: number,
): CrystalRecommendation => {
  const prepared: PreparedCrystalData = {
    steps: data.steps.map((step) => ({ ...step, targets: expandTargets(step) })),
    upgradeById: new Map(data.upgrades.map((upgrade) => [upgrade.id, upgrade] as const)),
  }
  const first = findCurrentStep(state, prepared)

  const actions: CrystalAction[] = []
  const simulated = { ...state, levels: { ...state.levels } }
  for (let i = 0; i < MAX_SIMULATED_ACTIONS && actions.length <= count; i++) {
    const next = pickNextAction(simulated, i === 0 ? first : findCurrentStep(simulated, prepared))
    if (!next) break

    // Consecutive chunks of the same upgrade are shown as one row.
    const last = actions[actions.length - 1]
    if (last && last.id === next.id) {
      last.targetLevel = next.targetLevel
      last.cost = addCost(last.cost, next.cost)
    } else {
      actions.push(next)
    }
    simulated.levels[next.id] = next.targetLevel
  }

  return {
    actions: actions.slice(0, count),
    step: first ? data.steps[first.index] : null,
    stepIndex: first?.index ?? -1,
    savingFor: findSavingGoals(state, prepared, first?.index ?? -1),
    doneNotes: findDoneNotes(state, prepared),
  }
}

// Levels after buying `count` levels of the first listed action.
export const levelsAfterBuying = (actions: CrystalAction[], count: number): CrystalLevels => {
  const first = actions[0]
  return first ? { [first.id]: first.currentLevel + count } : {}
}

// Levels after completing the first listed action.
export const levelsAfterCompletingFirst = (actions: CrystalAction[]): CrystalLevels => {
  const first = actions[0]
  return first ? { [first.id]: first.targetLevel } : {}
}
