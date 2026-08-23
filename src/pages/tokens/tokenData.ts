import type {
  TokenLevelRow,
  TokenLoadedData,
  TokenResourceId,
  TokenTargetRow,
  TokenUpgradeDefinition,
  TokenUpgradeDefinitionDocument,
} from "./tokenTypes"

const asNumber = (value: string | number | undefined, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const TARGET_LEVEL_BREAKPOINTS = [350, 1100, 1150, 1200, 1250, 1300, 1350, 1400] as const

const parseLevelRowsCsv = (rawCsv: string): TokenLevelRow[] => {
  const lines = rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const [header, ...rows] = lines
  const columns = header.split(",")
  const getColumnIndex = (name: string) => columns.findIndex((column) => column === name)

  const upgradeIdIndex = getColumnIndex("upgradeId")
  const levelIndex = getColumnIndex("level")
  const costIndex = getColumnIndex("cost")
  const shortTermIndex = getColumnIndex("shortTerm")
  const longTermIndex = getColumnIndex("longTerm")

  // Prior format compatibility.
  const shortTermX10000Index = getColumnIndex("shortTermX10000")
  const longTermX10000Index = getColumnIndex("longTermX10000")
  const shortTermPerCostScoreIndex = getColumnIndex("shortTermPerCostScore")
  const longTermPerCostScoreIndex = getColumnIndex("longTermPerCostScore")

  // Old legacy compatibility.
  const shortTermValueIndex = getColumnIndex("shortTermValue")
  const longTermValueIndex = getColumnIndex("longTermValue")

  const valueScale = 10000
  const perCostScale = 100000000

  return rows
    .map((line) => {
      const values = line.split(",")
      const upgradeId = values[upgradeIdIndex] ?? ""
      const level = asNumber(values[levelIndex])
      const cost = asNumber(values[costIndex])

      const shortTerm =
        shortTermIndex >= 0
          ? asNumber(values[shortTermIndex])
          : shortTermPerCostScoreIndex >= 0
            ? asNumber(values[shortTermPerCostScoreIndex]) / perCostScale
            : cost <= 0
              ? 0
              : shortTermX10000Index >= 0
                ? asNumber(values[shortTermX10000Index]) / valueScale / cost
                : asNumber(values[shortTermValueIndex]) / Math.max(cost, Number.EPSILON)

      const longTerm =
        longTermIndex >= 0
          ? asNumber(values[longTermIndex])
          : longTermPerCostScoreIndex >= 0
            ? asNumber(values[longTermPerCostScoreIndex]) / perCostScale
            : cost <= 0
              ? 0
              : longTermX10000Index >= 0
                ? asNumber(values[longTermX10000Index]) / valueScale / cost
                : asNumber(values[longTermValueIndex]) / Math.max(cost, Number.EPSILON)

      return {
        upgradeId,
        level,
        cost,
        shortTerm,
        longTerm,
      }
    })
    .filter((row) => row.upgradeId && row.level > 0)
}

const parseTargetRowsCsv = (rawCsv: string): TokenTargetRow[] => {
  const lines = rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) return []

  const [header, ...rows] = lines
  const columns = header.split(",")

  return rows
    .map((line, rowIndex) => {
      const values = line.split(",")
      const level = TARGET_LEVEL_BREAKPOINTS[rowIndex] ?? TARGET_LEVEL_BREAKPOINTS[TARGET_LEVEL_BREAKPOINTS.length - 1]
      const weights: Partial<Record<TokenResourceId, number>> = {}

      for (let index = 0; index < columns.length; index += 1) {
        const column = columns[index] as TokenResourceId
        weights[column] = asNumber(values[index])
      }

      return {
        level,
        weights,
      }
    })
    .filter((row) => row.level > 0)
    .sort((left, right) => left.level - right.level)
}

const parseUpgradeDefinitions = (document: TokenUpgradeDefinitionDocument): TokenUpgradeDefinition[] => {
  const upgrades = Array.isArray(document?.upgrades) ? document.upgrades : []

  return upgrades
    .map((upgrade) => ({
      ...upgrade,
      id: String(upgrade.id ?? "").trim(),
      label: String(upgrade.label ?? "").trim(),
      maxLevel: Math.max(1, Math.floor(asNumber(upgrade.maxLevel, 1))),
      baseValue: asNumber(upgrade.baseValue, 0),
      baseline: asNumber(upgrade.baseline, 0),
      costAnchors: (upgrade.costAnchors ?? [])
        .map((anchor) => ({
          level: Math.max(1, Math.floor(asNumber(anchor.level, 1))),
          cost: Math.max(0, asNumber(anchor.cost, 0)),
          step: Math.max(0, asNumber(anchor.step, 0)),
        }))
        .sort((left, right) => left.level - right.level),
    }))
    .filter((upgrade) => upgrade.id.length > 0 && upgrade.label.length > 0)
}

export const loadTokenData = async (): Promise<TokenLoadedData> => {
  const [definitionsModule, levelRowsModule, targetRowsModule] = await Promise.all([
    import("../../../data/token_upgrade_definitions.json"),
    import("../../../data/token_upgrade_levels.csv?raw"),
    import("../../../data/token_resource_targets.csv?raw"),
  ])

  const upgrades = parseUpgradeDefinitions(definitionsModule.default as TokenUpgradeDefinitionDocument)
  const levelRows = parseLevelRowsCsv(levelRowsModule.default)
  const targetRows = parseTargetRowsCsv(targetRowsModule.default)

  const rowByKey = new Map<string, TokenLevelRow>()
  for (const row of levelRows) {
    rowByKey.set(`${row.upgradeId}:${row.level}`, row)
  }

  return {
    upgrades,
    rowByKey,
    targetRows,
  }
}
