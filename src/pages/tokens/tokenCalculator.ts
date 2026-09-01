import type {
  TokenInputState,
  TokenLoadedData,
  TokenRecommendationRow,
  TokenUpgradeDefinition,
  TokenId,
} from "./tokenTypes"
import { getSupplyRatio } from "../../lib/boosts"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const toInt = (value: string) => Math.max(0, Math.floor(parseNumberish(value)))
const TERM_SCALE = 100000000

const normalizePerCostTerm = (rawTerm: number) => {
  // New CSV format stores short/long terms as scaled integers.
  return rawTerm >= 1 ? rawTerm / TERM_SCALE : rawTerm
}

const getCostFromAnchors = (upgrade: TokenUpgradeDefinition, level: number) => {
  const anchors = upgrade.costAnchors
  if (anchors.length === 0) return 0

  let activeAnchor = anchors[0]
  for (const anchor of anchors) {
    if (anchor.level > level) break
    activeAnchor = anchor
  }

  return Math.max(0, activeAnchor.cost + (level - activeAnchor.level) * activeAnchor.step)
}

const getLevelRow = (data: TokenLoadedData, upgrade: TokenUpgradeDefinition, level: number) => {
  const fromCsv = data.rowByKey.get(`${upgrade.id}:${level}`)
  if (fromCsv) return fromCsv

  const cost = getCostFromAnchors(upgrade, level)
  const shortTermValue = Math.max(0, upgrade.baseValue ?? 0)
  const longTermValue = shortTermValue
  const shortTerm = cost <= 0 ? 0 : shortTermValue / cost
  const longTerm = cost <= 0 ? 0 : longTermValue / cost

  return {
    upgradeId: upgrade.id,
    level,
    cost,
    shortTerm,
    longTerm,
  }
}

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

const resolveRankingLevel = (
  row: TokenRecommendationRow,
  granularity: number,
  upgradesById: Map<TokenId, TokenUpgradeDefinition>,
) => {
  const upgrade = upgradesById.get(row.id)
  if (!upgrade || upgrade.group !== "output" || granularity <= 1 || row.currentLevel > 1000) {
    return row.currentLevel
  }
  return Math.floor(row.currentLevel / granularity) * granularity
}

const compareRecommendationRows = (
  left: TokenRecommendationRow,
  right: TokenRecommendationRow,
  granularity: number,
  upgradesById: Map<TokenId, TokenUpgradeDefinition>,
) => {
  if (right.score !== left.score) return right.score - left.score
  const leftRankingLevel = resolveRankingLevel(left, granularity, upgradesById)
  const rightRankingLevel = resolveRankingLevel(right, granularity, upgradesById)
  if (leftRankingLevel !== rightRankingLevel) return leftRankingLevel - rightRankingLevel
  return left.id.localeCompare(right.id)
}

const insertRankedRecommendation = (
  rows: TokenRecommendationRow[],
  nextRow: TokenRecommendationRow,
  granularity: number,
  upgradesById: Map<TokenId, TokenUpgradeDefinition>,
) => {
  let insertAt = rows.findIndex((row) => compareRecommendationRows(nextRow, row, granularity, upgradesById) < 0)
  if (insertAt < 0) insertAt = rows.length

  rows.splice(insertAt, 0, nextRow)
  if (rows.length > 8) rows.length = 8
}

const resolveNextLevel = (upgrade: TokenUpgradeDefinition, currentLevel: number, granularity: number) => {
  if (upgrade.group !== "output") return Math.min(upgrade.maxLevel, currentLevel + 1)
  if (currentLevel >= 1000) return Math.min(upgrade.maxLevel, currentLevel + 1)
  const nextBreakPoint = Math.ceil((currentLevel + 1) / granularity) * granularity
  return Math.min(upgrade.maxLevel, nextBreakPoint)
}

const resolveSuppliesTimeMultiplier = (input: TokenInputState) =>
  getSupplyRatio(parseNumberish(input.onlineHoursPerDay))

const buildBaseRecommendation = (
  input: TokenInputState,
  data: TokenLoadedData,
  upgrade: TokenUpgradeDefinition,
  currentLevel: number,
  blend: number,
  granularity: number,
): TokenRecommendationRow => {
  const isChunkedOutput = upgrade.group === "output" && granularity > 1 && currentLevel < 1000
  const blockStartLevel = isChunkedOutput ? Math.floor(currentLevel / granularity) * granularity : currentLevel
  const nextLevel = resolveNextLevel(upgrade, currentLevel, granularity)
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

  const granularity = Math.max(1, Math.floor(parseNumberish(input.granularity)))

  const rows = data.upgrades.flatMap((upgrade) => {
    const enabled = isUpgradeEnabled(upgrade.id, input.enabled)
    const unlocked = isUnlocked(upgrade, input.levels)
    const currentLevel = resolveCurrentLevel(input, upgrade)

    if (!enabled || !unlocked || currentLevel >= upgrade.maxLevel) return []

    return [buildBaseRecommendation(input, data, upgrade, currentLevel, input.blendPercent, granularity)]
  })

  const upgradesById = new Map(data.upgrades.map((upgrade) => [upgrade.id, upgrade]))

  const ranked = rows
    .filter((row) => row.nextLevel !== null)
    .slice()
    .sort((left, right) => compareRecommendationRows(left, right, granularity, upgradesById))
    .slice(0, 8)

  if (ranked.length === 0) return { rows: [], best: null }

  // Last upgrade don't need to be checked.
  for (let index = 0; index < ranked.length - 1; index += 1) {
    const row = ranked[index]
    const upgrade = upgradesById.get(row.id)
    if (!upgrade || row.nextLevel === null) continue

    while (row.nextLevel < upgrade.maxLevel) {
      const successor = buildBaseRecommendation(input, data, upgrade, row.nextLevel, input.blendPercent, granularity)
      if (successor.nextLevel === null) break

      const lastScore = ranked[ranked.length - 1].score
      if (successor.score <= lastScore) break
      const nextScore = ranked[index + 1]?.score ?? Number.NEGATIVE_INFINITY
      if (successor.score > nextScore) {
        row.nextLevel = successor.nextLevel
        row.cost += successor.cost
        continue
      }

      insertRankedRecommendation(ranked, successor, granularity, upgradesById)
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

    for (let level = 1; level <= currentLevel; level += 1) {
      const levelRow = getLevelRow(data, upgrade, level)
      totalSpent += Math.max(0, levelRow.cost)
    }
  }

  return totalSpent
}
