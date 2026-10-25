import type {
  TokenInputState,
  TokenLoadedData,
  TokenRecommendationRow,
  TokenUpgradeDefinition,
  TokenId,
} from "./tokenTypes"
import { getSupplyRatio } from "../../lib/boosts"
import { parseNumberish, toInt } from "../../lib/parseNumber"

const TERM_SCALE = 100000000

const normalizePerCostTerm = (rawTerm: number) => {
  // New CSV format stores short/long terms as scaled integers.
  return rawTerm >= 1 ? rawTerm / TERM_SCALE : rawTerm
}

const getLevelRow = (data: TokenLoadedData, upgrade: TokenUpgradeDefinition, level: number) =>
  data.rowByKey.get(`${upgrade.id}:${level}`) ?? {
    upgradeId: upgrade.id,
    level,
    cost: 0,
    accumulatedCost: 0,
    shortTerm: 0,
    longTerm: 0,
  }

const getAccumulatedCost = (data: TokenLoadedData, upgrade: TokenUpgradeDefinition, level: number) =>
  level <= 0 ? 0 : getLevelRow(data, upgrade, level).accumulatedCost

const isUpgradeEnabled = (upgradeId: TokenId, enabledMap: TokenInputState["enabled"]) => {
  const current = enabledMap[upgradeId]
  return current == null ? true : Boolean(current)
}

const isUnlocked = (upgrade: TokenUpgradeDefinition, levels: TokenInputState["levels"]) => {
  if (!upgrade.requires) return true
  const currentLevel = Math.floor(parseNumberish(levels[upgrade.requires.id] ?? "0"))
  return currentLevel >= upgrade.requires.minLevel
}

const isSuppliesScaledUpgrade = (upgrade: TokenUpgradeDefinition) => {
  if (upgrade.group == "supplies") return true
  if (upgrade.id == "supplies.tokenBonus" || upgrade.id == "supplies.crystalBonus") return true
  return false
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

const buildBaseRecommendation = (
  input: TokenInputState,
  data: TokenLoadedData,
  upgrade: TokenUpgradeDefinition,
  currentLevel: number,
  blend: number,
  tokensPerStep: number,
): TokenRecommendationRow => {
  const { bucketIndex, blockStartLevel, nextLevel } = resolveBucket(data, upgrade, currentLevel, tokensPerStep)
  const valueScale = isSuppliesScaledUpgrade(upgrade) ? resolveSuppliesTimeMultiplier(input) : 1

  let levelCount = 0
  let remainingCost = 0
  let totalShortTermTerm = 0
  let totalLongTermTerm = 0

  for (let level = blockStartLevel + 1; level <= nextLevel; level += 1) {
    const levelRow = getLevelRow(data, upgrade, level)
    const levelCost = Math.max(0, levelRow.cost)
    const shortTermPerCost = normalizePerCostTerm(levelRow.shortTerm)
    const longTermPerCost = normalizePerCostTerm(levelRow.longTerm)

    levelCount += 1
    if (level > currentLevel) remainingCost += levelCost
    totalShortTermTerm += shortTermPerCost
    totalLongTermTerm += longTermPerCost
  }
  const shortTermValue = levelCount <= 0 ? 0 : totalShortTermTerm / levelCount
  const longTermValue = levelCount <= 0 ? 0 : totalLongTermTerm / levelCount
  const blendedPerCost = longTermValue * blend + shortTermValue * (1 - blend)

  return {
    id: upgrade.id,
    currentLevel,
    nextLevel,
    cost: remainingCost,
    score: blendedPerCost * valueScale,
    bucketIndex,
  }
}

export const calculateTokenRecommendations = (
  input: TokenInputState,
  data: TokenLoadedData | null,
): {
  rows: TokenRecommendationRow[]
  best: TokenRecommendationRow | null
} => {
  if (!data) return { rows: [], best: null }

  const tokensPerStep = Math.max(0, parseNumberish(input.tokensPerStep))

  const rows = data.upgrades.flatMap((upgrade) => {
    const enabled = isUpgradeEnabled(upgrade.id, input.enabled)
    const unlocked = isUnlocked(upgrade, input.levels)
    const currentLevel = resolveCurrentLevel(input, upgrade)

    if (!enabled || !unlocked || currentLevel >= upgrade.maxLevel) return []

    return [buildBaseRecommendation(input, data, upgrade, currentLevel, input.blendPercent, tokensPerStep)]
  })

  const upgradesById = new Map(data.upgrades.map((upgrade) => [upgrade.id, upgrade]))

  const ranked = rows
    .filter((row) => row.nextLevel !== null)
    .slice()
    .sort(compareRecommendationRows)
    .slice(0, 8)

  if (ranked.length === 0) return { rows: [], best: null }

  // Last upgrade don't need to be checked.
  for (let index = 0; index < ranked.length - 1; index += 1) {
    const row = ranked[index]
    const upgrade = upgradesById.get(row.id)
    if (!upgrade || row.nextLevel === null) continue

    while (row.nextLevel < upgrade.maxLevel) {
      const successor = buildBaseRecommendation(input, data, upgrade, row.nextLevel, input.blendPercent, tokensPerStep)
      if (successor.nextLevel === null) break

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

  return {
    rows: ranked,
    best: ranked[0] ?? null,
  }
}

export const calculateTotalTokensSpent = (input: TokenInputState, data: TokenLoadedData | null) => {
  if (!data) return 0

  let totalSpent = 0

  for (const upgrade of data.upgrades) {
    const currentLevel = resolveCurrentLevel(input, upgrade)
    if (currentLevel <= 0) continue

    totalSpent += getAccumulatedCost(data, upgrade, currentLevel)
  }

  return totalSpent
}
