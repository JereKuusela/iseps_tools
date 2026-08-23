import { readFromStorage, writeToStorage } from "./storage"

export const TOKEN_SHARED_KEYS = {
  onlineHoursPerDay: "token.onlineHoursPerDay",
  alphaSuppliesLevel: "token.alphaSuppliesLevel",
  junoOutputLevel: "token.junoOutputLevel",
} as const

const LEGACY_KEYS = {
  scOnlineHoursPerDay: "sc.onlineHoursPerDay",
  premiumAverageHoursPerDay: "premium.averageHoursPerDay",
  scAlphaSuppliesLevel: "sc.alphaSuppliesLevel",
  ogJunoOutputLevel: "zat.og.junoOutput",
} as const

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

export const migrateTokenSharedInputs = () => {
  migrateStringKey(
    TOKEN_SHARED_KEYS.onlineHoursPerDay,
    [LEGACY_KEYS.scOnlineHoursPerDay, LEGACY_KEYS.premiumAverageHoursPerDay],
    "10",
  )

  migrateStringKey(TOKEN_SHARED_KEYS.alphaSuppliesLevel, [LEGACY_KEYS.scAlphaSuppliesLevel], "10")
  migrateStringKey(TOKEN_SHARED_KEYS.junoOutputLevel, [LEGACY_KEYS.ogJunoOutputLevel], "10")
}
