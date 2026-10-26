import type { CrystalCost } from "./crystalTypes"

export const formatCrystalCost = (value: CrystalCost) => {
  const amount = Math.round(value.cost).toLocaleString("en-US")
  if (!value.unknown) return amount
  return value.cost > 0 ? `${amount}+?` : "?"
}
