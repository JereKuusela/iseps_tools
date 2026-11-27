import { createSyncedSignal } from "../lib/persistedSignal"
import { getCrystalKey } from "./storageKeys"

// Crystal upgrades are stored as numeric levels; one-timers are 0/1.
export const createCrystalFlagSignal = (upgradeId: string): [() => boolean, (checked: boolean) => boolean] => {
  const [level, setLevel] = createSyncedSignal(getCrystalKey(upgradeId), "0")
  return [() => level() === "1", (checked) => (setLevel(checked ? "1" : "0"), checked)]
}
