import { applyRawValue } from "./persistedSignal"

// [oldKey, newKey]: the new key wins if already set; the old key is always removed.
const KEY_MIGRATIONS: ReadonlyArray<readonly [string, string]> = [
  ["zat.og.junoAmount", "shared.particle.juno.current"],
  ["zat.og.gain", "shared.particle.juno.gain"],
  ["zat.og.gainUnit", "shared.particle.gainUnit"],
  ["zat.og.dcmLevel", "shared.dcmLevel"],
  ["zat.og.researchLevel", "shared.researchLevel"],
]

// Also called after a cloud pull, which can bring back old keys from other devices.
export const runStorageMigrations = () => {
  try {
    for (const [oldKey, newKey] of KEY_MIGRATIONS) {
      const rawValue = localStorage.getItem(oldKey)
      if (rawValue == null) continue
      if (localStorage.getItem(newKey) == null) applyRawValue(newKey, rawValue)
      localStorage.removeItem(oldKey)
    }
  } catch (error) {
    console.error("Error during storage migration:", error)
  }
}
