import { describe, expect, it } from "vitest"
import {
  calculateExponentIncreaseMultipliers,
  calculateNextThreeTechCosts,
  calculateNextZatCost,
  calculateSeEffect,
  calculateTechBoost,
  calculateTotalPremiumMultiplier,
  calculateZatBoostPerTech,
} from "./zatCalculator"
import { LargeNumber } from "./largeNumber"

const compareLarge = (a: LargeNumber, b: LargeNumber) => {
  expect(a.mantissa).toBeCloseTo(b.mantissa, 2)
  expect(a.exponent).toEqual(b.exponent)
}

describe("calculateZatBoostPerTech", () => {
  it("returns a positive boost for juno mode", () => {
    const boost = calculateZatBoostPerTech(10, "juno")
    expect(boost).toBeGreaterThan(1)
  })

  it("returns a larger boost for dc mode", () => {
    const juno = calculateZatBoostPerTech(10, "juno")
    const dc = calculateZatBoostPerTech(10, "dc")
    expect(dc).toBeGreaterThan(juno)
  })
})

describe("calculateSeEffect", () => {
  it("is zero before first mul rule", () => {
    expect(calculateSeEffect(10)).toBe(0)
  })

  it("uses active mul and div rules", () => {
    const effect = calculateSeEffect(80)
    expect(effect).toBeCloseTo(0.0147603654, 5)
  })
})

describe("calculateNextThreeTechCosts", () => {
  it("returns next three levels and increasing costs", () => {
    const result = calculateNextThreeTechCosts(0, 50)

    expect(result).toHaveLength(3)
    expect(result[0].level).toBe(50)
    compareLarge(result[0].cost, new LargeNumber(1, 173))
    expect(result[1].level).toBe(51)
    compareLarge(result[1].cost, new LargeNumber(1, 192))
    expect(result[2].level).toBe(52)
    compareLarge(result[2].cost, new LargeNumber(1, 211))
  })
})

describe("calculateTechBoost", () => {
  it("calculates juno boost", () => {
    const result = calculateTechBoost(1.5, 0.02, 2, "juno")
    expect(result.rawTechBoost).toBeGreaterThan(1)
    expect(result.finalBoost).toBeGreaterThan(0)
  })

  it("calculates dc boost", () => {
    const result = calculateTechBoost(1.5, 0.02, 2, "dc")
    expect(result.rawTechBoost).toBeCloseTo(2.47, 2)
  })
})

describe("calculateExponentIncreaseMultipliers", () => {
  it("returns multipliers for default deltas", () => {
    const multipliers = calculateExponentIncreaseMultipliers("1e100", 2, 10)
    expect(multipliers).toHaveLength(3)
    expect(multipliers[2].delta).toBeCloseTo(0.01)
    expect(multipliers[2].multiplier).toBeGreaterThan(1)
  })
})

describe("calculateTotalPremiumMultiplier", () => {
  it("handles additive, multiplicative and exponent premiums", () => {
    const result = calculateTotalPremiumMultiplier({
      "Juno Output": 100,
      "Juno Bundle": true,
      tokens: 1100,
      "Meltdown Bundle": true,
    })

    expect(result.additive).toBeCloseTo(3.5, 5)
    expect(result.multiplicative).toBeCloseTo(1.01 ** 100, 5)
    expect(result.multiplier).toBeGreaterThan(4.5)
    expect(result.exponentAdd).toBeCloseTo(0.005, 5)
  })
})

describe("calculateNextZatCost", () => {
  it("returns cycle 2 for exactly cycle 1 cost", () => {
    const next = calculateNextZatCost(new LargeNumber(1, 5))
    expect(next.cycle).toBe(2)
    compareLarge(next.cost, new LargeNumber(1, 10))
  })

  it("returns cycle 1 for low juno", () => {
    const next = calculateNextZatCost(new LargeNumber(1, 4))
    expect(next.cycle).toBe(1)
    compareLarge(next.cost, new LargeNumber(1, 5))
  })

  it("returns cycle 5 with 1e60 cost for 1e50 juno", () => {
    const next = calculateNextZatCost(new LargeNumber(1, 50))
    expect(next.cycle).toBe(7)
    compareLarge(next.cost, new LargeNumber(1, 60))
  })
})
