import type {
  TokenInputState,
  TokenLoadedData,
  TokenRecommendationRow,
  TokenResourceId,
  TokenTargetRow,
  TokenUpgradeDefinition,
} from "./tokenTypes"
import { calculateSuppliesMultiplier } from "../../lib/suppliesTime"

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

const interpolateTargetWeight = (rows: TokenTargetRow[], resource: TokenResourceId, level: number) => {
  if (rows.length === 0) return 1

  const sorted = rows
  const clampedLevel = Math.max(sorted[0].level, Math.min(level, sorted[sorted.length - 1].level))

  let lower = sorted[0]
  let upper = sorted[sorted.length - 1]

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index]
    if (current.level <= clampedLevel) lower = current
    if (current.level >= clampedLevel) {
      upper = current
      break
    }
  }

  const lowerValue = lower.weights[resource] ?? 1
  const upperValue = upper.weights[resource] ?? lowerValue

  if (upper.level === lower.level) return lowerValue

  const ratio = (clampedLevel - lower.level) / (upper.level - lower.level)
  return lowerValue + (upperValue - lowerValue) * ratio
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

const isUpgradeEnabled = (upgradeId: string, enabledMap: TokenInputState["enabled"]) => {
  const current = enabledMap[upgradeId]
  return current == null ? true : Boolean(current)
}

const isUnlocked = (upgrade: TokenUpgradeDefinition, levels: TokenInputState["levels"]) => {
  if (!upgrade.requires) return true
  const currentLevel = Math.floor(parseNumberish(levels[upgrade.requires.id] ?? "0"))
  return currentLevel >= upgrade.requires.minLevel
}

const resolveResourceWeight = (
  resource: TokenResourceId | undefined,
  rows: TokenTargetRow[],
  outputLevelsByResource: TokenInputState["outputLevelsByResource"],
) => {
  if (!resource) return 1

  const rawLevel = parseNumberish(outputLevelsByResource[resource] ?? "0")
  const level = Math.max(0, Math.floor(rawLevel))
  const weight = interpolateTargetWeight(rows, resource, level)
  return Math.max(0.01, weight)
}

const isSuppliesScaledUpgrade = (upgrade: TokenUpgradeDefinition) => {
  if (upgrade.group == "supplies") return true
  if (upgrade.id == "special.suppliesToken" || upgrade.id == "special.suppliesCrystal") return true
  return false
}

const compareRecommendationRows = (left: TokenRecommendationRow, right: TokenRecommendationRow) => {
  if (right.score !== left.score) return right.score - left.score
  if (left.currentLevel !== right.currentLevel) return left.currentLevel - right.currentLevel
  return left.id.localeCompare(right.id)
}

const insertRankedRecommendation = (rows: TokenRecommendationRow[], nextRow: TokenRecommendationRow) => {
  let insertAt = rows.findIndex((row) => compareRecommendationRows(nextRow, row) < 0)
  if (insertAt < 0) insertAt = rows.length

  rows.splice(insertAt, 0, nextRow)
  if (rows.length > 8) rows.length = 8
}

const resolveNextLevel = (upgrade: TokenUpgradeDefinition, currentLevel: number, granularity: number) => {
  if (upgrade.group !== "output") return Math.min(upgrade.maxLevel, currentLevel + 1)
  const nextBreakPoint = Math.ceil((currentLevel + 1) / granularity) * granularity
  return Math.min(upgrade.maxLevel, nextBreakPoint)
}

const resolveSuppliesTimeMultiplier = (
  input: TokenInputState,
  upgrade: TokenUpgradeDefinition,
  currentLevel: number,
) => {
  const onlineHours = parseNumberish(input.onlineHoursPerDay)
  const configuredSuppliesLevel = Math.max(0, parseNumberish(input.alphaSuppliesLevel))
  const suppliesLevelNow = upgrade.id === "supplies.alpha" ? currentLevel : configuredSuppliesLevel
  const suppliesLevelNext = suppliesLevelNow + 1

  const currentMultiplier = calculateSuppliesMultiplier(onlineHours, suppliesLevelNow)
  const nextMultiplier = calculateSuppliesMultiplier(onlineHours, suppliesLevelNext)

  if (currentMultiplier <= 0) return 0
  return Math.max(0, nextMultiplier / currentMultiplier - 1)
}

const buildBaseRecommendation = (
  input: TokenInputState,
  data: TokenLoadedData,
  upgrade: TokenUpgradeDefinition,
  currentLevel: number,
  blend: number,
  granularity: number,
): TokenRecommendationRow => {
  const isChunkedOutput = upgrade.group === "output" && granularity > 1
  const blockStartLevel = isChunkedOutput ? Math.floor(currentLevel / granularity) * granularity : currentLevel
  const nextLevel = resolveNextLevel(upgrade, currentLevel, granularity)
  const valueScale = isSuppliesScaledUpgrade(upgrade) ? resolveSuppliesTimeMultiplier(input, upgrade, currentLevel) : 1

  let totalCost = 0
  let remainingCost = 0
  let totalShortTermValue = 0
  let totalLongTermValue = 0

  for (let level = blockStartLevel + 1; level <= nextLevel; level += 1) {
    const levelRow = getLevelRow(data, upgrade, level)
    const levelCost = Math.max(0, levelRow.cost)
    const shortTermPerCost = normalizePerCostTerm(levelRow.shortTerm)
    const longTermPerCost = normalizePerCostTerm(levelRow.longTerm)

    totalCost += levelCost
    if (level > currentLevel) remainingCost += levelCost
    totalShortTermValue += shortTermPerCost * levelCost
    totalLongTermValue += longTermPerCost * levelCost
  }

  const blendedPerCost =
    totalCost <= 0 ? 0 : (totalShortTermValue * blend + totalLongTermValue * (1 - blend)) / totalCost

  const outputLevelsForWeight =
    upgrade.group === "output" && upgrade.resource
      ? {
          ...input.outputLevelsByResource,
          [upgrade.resource]: String(blockStartLevel),
        }
      : input.outputLevelsByResource
  const resourceWeight = resolveResourceWeight(upgrade.resource, data.targetRows, outputLevelsForWeight)

  return {
    id: upgrade.id,
    label: upgrade.label,
    group: upgrade.group,
    resource: upgrade.resource,
    currentLevel,
    nextLevel,
    maxLevel: upgrade.maxLevel,
    cost: remainingCost,
    shortTermValue: totalShortTermValue * valueScale,
    longTermValue: totalLongTermValue * valueScale,
    weightedValue: blendedPerCost * resourceWeight * valueScale,
    score: blendedPerCost * resourceWeight * valueScale,
    projectedTimeSeconds: null,
    projectionReady: false,
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

  const blend = clamp(parseNumberish(input.blendPercent), 0, 100) / 100
  const granularity = Math.max(1, Math.floor(parseNumberish(input.granularity)))

  const rows = data.upgrades.flatMap((upgrade) => {
    const enabled = isUpgradeEnabled(upgrade.id, input.enabled)
    const unlocked = isUnlocked(upgrade, input.levels)
    const currentLevel =
      upgrade.group === "output" && upgrade.resource
        ? toInt(input.outputLevelsByResource[upgrade.resource] ?? "0")
        : toInt(input.levels[upgrade.id] ?? "0")

    if (!enabled || !unlocked || currentLevel >= upgrade.maxLevel) return []

    return [buildBaseRecommendation(input, data, upgrade, currentLevel, blend, granularity)]
  })

  const ranked = rows
    .filter((row) => row.nextLevel !== null)
    .slice()
    .sort(compareRecommendationRows)
    .slice(0, 8)

  if (ranked.length === 0) return { rows: [], best: null }

  const upgradesById = new Map(data.upgrades.map((upgrade) => [upgrade.id, upgrade]))

  // Last upgrade don't need to be checked.
  for (let index = 0; index < ranked.length - 1; index += 1) {
    const row = ranked[index]
    const upgrade = upgradesById.get(row.id)
    if (!upgrade || row.nextLevel === null) continue

    while (row.nextLevel < row.maxLevel) {
      const successor = buildBaseRecommendation(input, data, upgrade, row.nextLevel, blend, granularity)
      if (successor.nextLevel === null) break

      const lastScore = ranked[ranked.length - 1].score
      if (successor.score <= lastScore) break
      const nextScore = ranked[index + 1].score
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
