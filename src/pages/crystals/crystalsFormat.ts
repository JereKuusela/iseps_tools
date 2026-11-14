import type { CrystalCost } from "./crystalsTypes"

export const formatCrystalCost = (value: CrystalCost) => Math.round(value.cost).toLocaleString("en-US")
