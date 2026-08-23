import { describe, expect, it } from "vitest"
import { calculateSuppliesMultiplier } from "./suppliesTime"

describe("calculateExtraPerDay", () => {
  it("returns a time multiplier", () => {
    const multiplier = calculateSuppliesMultiplier(10, 1)
    expect(multiplier).toBeCloseTo(1 + 20 / (7 * 1440))
  })

  it("returns neutral multiplier when supplies level is zero", () => {
    expect(calculateSuppliesMultiplier(560, 0)).toBe(1)
  })

  it("caps online time contribution", () => {
    const atCap = calculateSuppliesMultiplier(10, 5)
    const aboveCap = calculateSuppliesMultiplier(24, 5)

    expect(aboveCap).toBeCloseTo(atCap)
  })
})
