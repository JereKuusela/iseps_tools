import { describe, expect, it } from "vitest"
import { calculateBoostsMultiplier, calculateChestsMultiplier } from "./boosts"

describe("calculateBoostsMultiplier", () => {
  it("calculates chest-only bonus without Supplies", () => {
    expect(calculateChestsMultiplier(10)).toBeCloseTo(1 + 380 / 1440)
  })

  it("sums independently scaled Supplies and chest skips", () => {
    const multiplier = calculateBoostsMultiplier(10, 1)
    expect(multiplier).toBeCloseTo(1 + (2 + 200 + 180) / 1440)
  })

  it("returns neutral multiplier with no online time and no supplies", () => {
    expect(calculateBoostsMultiplier(0, 0)).toBe(1)
  })

  it("caps each chest source at its maximum daily skip", () => {
    const atCap = calculateBoostsMultiplier(10, 5)
    const aboveCap = calculateBoostsMultiplier(24, 5)

    expect(aboveCap).toBeCloseTo(atCap)
  })
})
