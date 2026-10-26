import { readFromStorage, writeToStorage } from "./storage"

export const getCrystalKey = (upgradeId: string) => `crystal.${upgradeId}`

const LEGACY_LEVEL_KEYS: Record<string, string> = {
  "zat.og.junoOutput": "output.juno",
  "premium.tokenBooster": "special.tokenBooster",
}

// Legacy OG toggles were stored as booleans; crystal upgrades are always numeric levels.
const LEGACY_FLAG_KEYS: Record<string, string> = {
  "zat.og.bundle.juno": "bundle.juno",
  "zat.og.bundle.ixion": "bundle.ixionJuno",
  "zat.og.bundle.kappa": "bundle.junoKappa",
  "zat.og.meltdown": "bundle.meltdown",
}

const hasStoredValue = (key: string) => localStorage.getItem(key) != null

export const migrateCrystalSharedInputs = () => {
  for (const [legacyKey, upgradeId] of Object.entries(LEGACY_LEVEL_KEYS)) {
    const nextKey = getCrystalKey(upgradeId)
    if (hasStoredValue(nextKey) || !hasStoredValue(legacyKey)) continue
    writeToStorage(nextKey, readFromStorage(legacyKey, "0"))
  }

  for (const [legacyKey, upgradeId] of Object.entries(LEGACY_FLAG_KEYS)) {
    const nextKey = getCrystalKey(upgradeId)
    if (hasStoredValue(nextKey) || !hasStoredValue(legacyKey)) continue
    writeToStorage(nextKey, readFromStorage(legacyKey, false) ? "1" : "0")
  }
}
