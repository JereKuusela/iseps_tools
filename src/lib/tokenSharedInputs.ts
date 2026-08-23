import { TokenId } from "../pages/tokens/tokenTypes"
import { readFromStorage, writeToStorage } from "./storage"

export const TOKEN_SHARED_KEYS = {
  onlineHoursPerDay: "token.onlineHoursPerDay",
} as const

const LEGACY_KEYS = {
  scAlphaSuppliesLevel: "sc.alphaSuppliesLevel",
  scOnlineHoursPerDay: "sc.onlineHoursPerDay",
  premiumAverageHoursPerDay: "premium.averageHoursPerDay",
  ogTokens: "zat.og.tokens",
  ogJunoOutput: "zat.og.junoOutput",
  tokenJunoOutputLevel: "token.junoOutputLevel",
  tokenOutputLevelsByResource: "token.outputLevelsByResource",
  tokenUpgradeLevels: "token.upgradeLevels",
} as const

const LEGACY_UPGRADE_ID_RENAMES: Record<string, TokenId> = {
  "special.suppliesToken": "supplies.tokenBonus",
  "special.suppliesCrystal": "supplies.crystalBonus",
  "special.bbbotDuration": "bbbot.duration",
  "special.bbbotToken": "bbbot.tokenBonus",
}

export const getTokenKey = <T extends TokenId>(upgradeId: T): `token.${T}` => `token.${upgradeId}`

const parseLevelMap = (raw: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}

    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!key) continue
      result[key] = String(value ?? "0")
    }

    return result
  } catch {
    return {}
  }
}

const normalizeUpgradeId = (upgradeId: string) => LEGACY_UPGRADE_ID_RENAMES[upgradeId] ?? upgradeId

const hasStoredValue = (key: string) => localStorage.getItem(key) != null

const migrateStringKey = (nextKey: string, legacyKeys: readonly string[], fallbackValue: string) => {
  if (hasStoredValue(nextKey)) return

  for (const key of legacyKeys) {
    if (!hasStoredValue(key)) continue
    const migrated = readFromStorage(key, fallbackValue)
    writeToStorage(nextKey, migrated)
    return
  }

  writeToStorage(nextKey, fallbackValue)
}

const migrateUpgradeLevel = (upgradeId: TokenId, level: string) => {
  const nextKey = getTokenKey(upgradeId)
  if (hasStoredValue(nextKey)) return

  writeToStorage(nextKey, String(level))
}

const migrateOutputLevelMap = () => {
  if (!hasStoredValue(LEGACY_KEYS.tokenOutputLevelsByResource)) return

  const outputLevelsRaw = readFromStorage(LEGACY_KEYS.tokenOutputLevelsByResource, "{}")
  const outputLevels = parseLevelMap(outputLevelsRaw)

  for (const [resource, level] of Object.entries(outputLevels)) {
    migrateUpgradeLevel(`output.${resource}` as TokenId, level)
  }
}

const migrateUpgradeLevelMap = () => {
  if (!hasStoredValue(LEGACY_KEYS.tokenUpgradeLevels)) return

  const upgradeLevelsRaw = readFromStorage(LEGACY_KEYS.tokenUpgradeLevels, "{}")
  const upgradeLevels = parseLevelMap(upgradeLevelsRaw)

  for (const [upgradeId, level] of Object.entries(upgradeLevels)) {
    migrateUpgradeLevel(upgradeId as TokenId, level)
  }
}

const migrateJunoOutputLevel = () => {
  const canonicalJunoKey = getTokenKey("output.juno")
  if (hasStoredValue(canonicalJunoKey)) return

  migrateStringKey(canonicalJunoKey, [LEGACY_KEYS.tokenJunoOutputLevel, LEGACY_KEYS.ogTokens], "0")
}

const migrateAlphaSuppliesLevel = () => {
  const canonicalAlphaSuppliesKey = getTokenKey("supplies.alpha")
  if (hasStoredValue(canonicalAlphaSuppliesKey)) return

  migrateStringKey(canonicalAlphaSuppliesKey, [LEGACY_KEYS.scAlphaSuppliesLevel, LEGACY_KEYS.ogTokens], "0")
}

const migrateRenamedUpgradeIds = () => {
  for (const [legacyUpgradeId, nextUpgradeId] of Object.entries(LEGACY_UPGRADE_ID_RENAMES)) {
    const legacyKey = getTokenKey(legacyUpgradeId as TokenId)
    const nextKey = getTokenKey(nextUpgradeId)
    if (!hasStoredValue(legacyKey) || hasStoredValue(nextKey)) continue

    const migrated = readFromStorage(legacyKey, "0")
    writeToStorage(nextKey, migrated)
  }
}

export const migrateTokenSharedInputs = () => {
  migrateStringKey(
    TOKEN_SHARED_KEYS.onlineHoursPerDay,
    [LEGACY_KEYS.scOnlineHoursPerDay, LEGACY_KEYS.premiumAverageHoursPerDay],
    "10",
  )

  migrateOutputLevelMap()
  migrateUpgradeLevelMap()
  migrateJunoOutputLevel()
  migrateRenamedUpgradeIds()
  migrateAlphaSuppliesLevel()
}
