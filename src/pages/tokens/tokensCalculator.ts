import type {
  TokenInputState,
  TokenLoadedData,
  TokenRecommendationRow,
  TokenUpgradeDefinition,
  TokenId,
} from "./tokensTypes"
import { getSupplyRatio } from "../../lib/boosts"
import { parseNumberish, toInt } from "../../lib/parseNumber"
import { buildSpendingReport } from "../../lib/spendingReport"
import { PARTICLE_ORDER } from "../../lib/particles"
import { capitalize } from "../../lib/textFormat"

const TERM_SCALE = 100000000

export type UnmetTokenRequirement =
  | { type: "particle"; resource: NonNullable<TokenUpgradeDefinition["resource"]> }
  | { type: "se"; minimum: number }
  | { type: "upgrade"; id: TokenId; minimum: number }

export const getTokenUnmetRequirements = (
  upgrade: TokenUpgradeDefinition,
  input: Pick<TokenInputState, "se" | "unlockedParticle" | "levels">,
): UnmetTokenRequirement[] => {
  const unmet: UnmetTokenRequirement[] = []
  if (
    upgrade.group === "output" &&
    upgrade.resource &&
    upgrade.resource !== "cash" &&
    input.unlockedParticle &&
    PARTICLE_ORDER.indexOf(upgrade.resource) > PARTICLE_ORDER.indexOf(input.unlockedParticle)
  ) {
    unmet.push({ type: "particle", resource: upgrade.resource })
  }
  const requirement = upgrade.requires
  if (requirement?.se !== undefined && (input.se ?? 0) < requirement.se) {
    unmet.push({ type: "se", minimum: requirement.se })
  }
  if (requirement?.id && toInt(input.levels[requirement.id] ?? "0") < (requirement.minLevel ?? 0)) {
    unmet.push({ type: "upgrade", id: requirement.id, minimum: requirement.minLevel ?? 0 })
  }
  return unmet
}

export const formatTokenRequirement = (
  requirement: UnmetTokenRequirement,
  upgrades: TokenUpgradeDefinition[],
): string => {
  if (requirement.type === "particle") return `Unlock ${capitalize(requirement.resource)}`
  if (requirement.type === "se") return `Requires SE${requirement.minimum}`
  const prerequisite = upgrades.find((candidate) => candidate.id === requirement.id)
  return `Requires ${prerequisite?.label ?? requirement.id} level ${requirement.minimum}`
}

const getLevelRow = (data: TokenLoadedData, upgrade: TokenUpgradeDefinition, level: number) =>
  data.rowByKey.get(`${upgrade.id}:${level}`) ?? {
    upgradeId: upgrade.id,
    level,
    cost: 0,
    accumulatedCost: 0,
    value: 0,
  }

const getAccumulatedCost = (data: TokenLoadedData, upgrade: TokenUpgradeDefinition, level: number) =>
  level <= 0 ? 0 : getLevelRow(data, upgrade, level).accumulatedCost

const isUpgradeEnabled = (upgradeId: TokenId, enabledMap: TokenInputState["enabled"]) => {
  const current = enabledMap[upgradeId]
  return current == null ? true : Boolean(current)
}

const resolveCurrentLevel = (input: TokenInputState, upgrade: TokenUpgradeDefinition) => {
  const currentLevel =
    upgrade.group === "output" && upgrade.resource
      ? toInt(input.outputLevelsByResource[upgrade.resource] ?? "0")
      : toInt(input.levels[upgrade.id] ?? "0")

  return Math.min(upgrade.maxLevel, currentLevel)
}

const compareRecommendationRows = (left: TokenRecommendationRow, right: TokenRecommendationRow) => {
  if (right.score !== left.score) return right.score - left.score
  if (left.bucketIndex !== right.bucketIndex) return left.bucketIndex - right.bucketIndex
  return left.id.localeCompare(right.id)
}

const insertRankedRecommendation = (rows: TokenRecommendationRow[], nextRow: TokenRecommendationRow) => {
  let insertAt = rows.findIndex((row) => compareRecommendationRows(nextRow, row) < 0)
  if (insertAt < 0) insertAt = rows.length

  rows.splice(insertAt, 0, nextRow)
  if (rows.length > 8) rows.length = 8
}

const COST_EPSILON = 1e-6

// Levels are grouped into fixed buckets of `budget` accumulated tokens; budget <= 0 means single levels.
const resolveBucket = (
  data: TokenLoadedData,
  upgrade: TokenUpgradeDefinition,
  currentLevel: number,
  budget: number,
) => {
  const firstLevel = currentLevel + 1
  if (budget <= 0) return { bucketIndex: firstLevel, blockStartLevel: currentLevel, nextLevel: firstLevel }

  const bucketIndex = Math.max(1, Math.ceil(getAccumulatedCost(data, upgrade, firstLevel) / budget - COST_EPSILON))
  const upperCost = bucketIndex * budget + COST_EPSILON
  const lowerCost = (bucketIndex - 1) * budget + COST_EPSILON

  let low = firstLevel
  let high = upgrade.maxLevel
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (getAccumulatedCost(data, upgrade, mid) <= upperCost) low = mid
    else high = mid - 1
  }
  const nextLevel = low

  let start = 1
  let end = firstLevel
  while (start < end) {
    const mid = Math.floor((start + end) / 2)
    if (getAccumulatedCost(data, upgrade, mid) > lowerCost) end = mid
    else start = mid + 1
  }

  return { bucketIndex, blockStartLevel: start - 1, nextLevel }
}

const resolveSuppliesTimeMultiplier = (input: TokenInputState) =>
  getSupplyRatio(parseNumberish(input.onlineHoursPerDay))

const buildSpecialRecommendation = (
  input: TokenInputState,
  data: TokenLoadedData,
  upgrade: TokenUpgradeDefinition,
  currentLevel: number,
): TokenRecommendationRow | null => {
  const nextLevel = currentLevel + 1
  const { cost, value } = getLevelRow(data, upgrade, nextLevel)
  if (cost <= 0) return null

  const score = value / TERM_SCALE

  if (upgrade.id === "bbbot.duration") {
    const bonus = data.upgrades.find((candidate) => candidate.id === "bbbot.tokenBonus")
    const required = bonus?.requires?.id === upgrade.id ? (bonus.requires.minLevel ?? 0) : 0
    if (!bonus || required <= currentLevel || !isUpgradeEnabled(bonus.id, input.enabled)) return null
    if (resolveCurrentLevel(input, bonus) >= bonus.maxLevel) return null
  }

  if (score <= 0) return null
  return {
    id: upgrade.id,
    currentLevel,
    nextLevel,
    cost,
    score,
    bucketIndex: nextLevel,
  }
}

const buildBaseRecommendation = (
  input: TokenInputState,
  data: TokenLoadedData,
  upgrade: TokenUpgradeDefinition,
  currentLevel: number,
  tokensPerStep: number,
): TokenRecommendationRow => {
  const { bucketIndex, blockStartLevel, nextLevel } = resolveBucket(data, upgrade, currentLevel, tokensPerStep)
  const valueScale = upgrade.group === "supplies" ? resolveSuppliesTimeMultiplier(input) : 1

  let levelCount = 0
  let remainingCost = 0
  let totalValue = 0

  for (let level = blockStartLevel + 1; level <= nextLevel; level += 1) {
    const levelRow = getLevelRow(data, upgrade, level)
    const levelCost = Math.max(0, levelRow.cost)

    levelCount += 1
    if (level > currentLevel) remainingCost += levelCost
    totalValue += levelRow.value / TERM_SCALE
  }
  let score = levelCount <= 0 ? 0 : (totalValue / levelCount) * valueScale
  if (input.deltaLikeCeti && upgrade.resource === "delta") {
    const cetiUpgrade = data.upgrades.find(
      (candidate) => candidate.group === upgrade.group && candidate.resource === "ceti",
    )
    if (cetiUpgrade) {
      const cetiLevel = Math.min(currentLevel, cetiUpgrade.maxLevel - 1)
      score = buildBaseRecommendation(
        { ...input, deltaLikeCeti: false },
        data,
        cetiUpgrade,
        cetiLevel,
        tokensPerStep,
      ).score
    }
  }

  return {
    id: upgrade.id,
    currentLevel,
    nextLevel,
    cost: remainingCost,
    score,
    bucketIndex,
  }
}

export const calculateTokenRecommendations = (
  input: TokenInputState,
  data: TokenLoadedData | null,
): {
  rows: TokenRecommendationRow[]
  best: TokenRecommendationRow | null
  bestSpecial: TokenRecommendationRow | null
} => {
  if (!data) return { rows: [], best: null, bestSpecial: null }

  const tokensPerStep = Math.max(0, parseNumberish(input.tokensPerStep))
  const buildRecommendation = (upgrade: TokenUpgradeDefinition, currentLevel: number) =>
    upgrade.group === "special"
      ? buildSpecialRecommendation(input, data, upgrade, currentLevel)
      : buildBaseRecommendation(input, data, upgrade, currentLevel, tokensPerStep)

  const rows = data.upgrades.flatMap((upgrade) => {
    const enabled = isUpgradeEnabled(upgrade.id, input.enabled)
    const unlocked = getTokenUnmetRequirements(upgrade, input).length === 0
    const currentLevel = resolveCurrentLevel(input, upgrade)

    if (!enabled || !unlocked || currentLevel >= upgrade.maxLevel) return []

    const row = buildRecommendation(upgrade, currentLevel)
    return row ? [row] : []
  })

  const upgradesById = new Map(data.upgrades.map((upgrade) => [upgrade.id, upgrade]))
  const bestSpecial =
    rows.filter((row) => upgradesById.get(row.id)?.group === "special").sort(compareRecommendationRows)[0] ?? null

  const ranked = rows
    .filter((row) => row.nextLevel !== null)
    .slice()
    .sort(compareRecommendationRows)
    .slice(0, 8)
    .map((row) => (row === bestSpecial ? { ...row } : row))

  if (ranked.length === 0) return { rows: [], best: null, bestSpecial: null }

  // Last upgrade don't need to be checked.
  for (let index = 0; index < ranked.length - 1; index += 1) {
    const row = ranked[index]
    const upgrade = upgradesById.get(row.id)
    if (!upgrade || row.nextLevel === null) continue

    while (row.nextLevel < upgrade.maxLevel) {
      const successor = buildRecommendation(upgrade, row.nextLevel)
      if (!successor || successor.nextLevel === null) break

      const lastScore = ranked[ranked.length - 1].score
      if (successor.score <= lastScore) break
      const nextScore = ranked[index + 1]?.score ?? Number.NEGATIVE_INFINITY
      if (successor.score > nextScore) {
        row.nextLevel = successor.nextLevel
        row.cost += successor.cost
        continue
      }

      insertRankedRecommendation(ranked, successor)
      break
    }
  }

  const best = ranked[0] ?? null
  return {
    rows: ranked,
    best,
    bestSpecial: best?.id === bestSpecial?.id ? null : bestSpecial,
  }
}

export const calculateTokenSpendingReport = (input: TokenInputState, data: TokenLoadedData | null) =>
  buildSpendingReport(
    (data?.upgrades ?? []).map((upgrade) => {
      const level = resolveCurrentLevel(input, upgrade)
      return {
        id: upgrade.id,
        name: upgrade.label,
        group: upgrade.group,
        level,
        maxLevel: upgrade.maxLevel,
        spent: getAccumulatedCost(data!, upgrade, level),
      }
    }),
    [
      { id: "output", name: "Output" },
      { id: "supplies", name: "Supplies" },
      { id: "bbbot", name: "BB-Bot" },
      { id: "special", name: "Special" },
    ],
  )

export const calculateTotalTokensSpent = (input: TokenInputState, data: TokenLoadedData | null) =>
  calculateTokenSpendingReport(input, data).total
