import type {
  TokenLevelRow,
  TokenLoadedData,
  TokenUpgradeDefinition,
  TokenUpgradeDefinitionDocument,
} from "./tokenTypes"

const asNumber = (value: string | number | undefined, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const hasValue = (value: string | undefined) => value != null && value.trim().length > 0

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

  return rows
    .map((line) => {
      const values = line.split(",")
      const upgradeId = values[upgradeIdIndex] ?? ""
      const level = asNumber(values[levelIndex])
      const cost = asNumber(values[costIndex])

      const shortTerm = shortTermIndex >= 0 ? asNumber(values[shortTermIndex]) : 0

      const longTermCell = longTermIndex >= 0 ? values[longTermIndex] : undefined
      const longTerm =
        longTermIndex >= 0 ? (hasValue(longTermCell) ? asNumber(longTermCell, shortTerm) : shortTerm) : shortTerm

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
  const [definitionsModule, levelRowsModule] = await Promise.all([
    import("../../../data/token_upgrade_definitions.json"),
    import("../../../data/token_upgrade_levels.csv?raw"),
  ])

  const upgrades = parseUpgradeDefinitions(definitionsModule.default as TokenUpgradeDefinitionDocument)
  const levelRows = parseLevelRowsCsv(levelRowsModule.default)

  const rowByKey = new Map<string, TokenLevelRow>()
  for (const row of levelRows) {
    rowByKey.set(`${row.upgradeId}:${row.level}`, row)
  }

  return {
    upgrades,
    rowByKey,
  }
}
