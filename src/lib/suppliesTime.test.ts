import { describe, expect, it } from "vitest"
import { calculateSuppliesMultiplier } from "./suppliesTime"

describe("calculateExtraPerDay", () => {
  it("returns a time multiplier", () => {
    const multiplier = calculateSuppliesMultiplier(560, 1)
    expect(multiplier).toBeCloseTo(1 + 1 / 9)
  })

  it("returns neutral multiplier when supplies level is zero", () => {
    expect(calculateSuppliesMultiplier(560, 0)).toBe(1)
  })

  it("caps online time contribution", () => {
    const atCap = calculateSuppliesMultiplier(560, 5)
    const aboveCap = calculateSuppliesMultiplier(24_000, 5)

    expect(aboveCap).toBeCloseTo(atCap)
  })
})
