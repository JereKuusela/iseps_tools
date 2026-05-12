import { describe, expect, it } from "vitest"
import {
  calculateOg0TotalBoostFromGuide,
  calculateExponentIncreaseMultipliers,
  calculateNextThreeTechCosts,
  calculateTechValues,
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
    const boost = calculateZatBoostPerTech(10, "juno", 1, 1)
    expect(boost).toBeGreaterThan(1)
  })

  it("returns a larger boost for dc mode", () => {
    const juno = calculateZatBoostPerTech(10, "juno", 1, 1)
    const dc = calculateZatBoostPerTech(10, "dc", 1, 1)
    expect(dc).toBeGreaterThan(juno)
  })

  it("increases with exponent input", () => {
    const base = calculateZatBoostPerTech(14, "juno", 1, 1)
    const boosted = calculateZatBoostPerTech(14, "juno", 2, 1)

    expect(boosted).toBeGreaterThan(base)
  })

  it("applies OG0 recursive factor when OG0 context is provided", () => {
    const withoutOg0 = calculateZatBoostPerTech(16, "juno", 1.2, 1)
    const junoRecursive = calculateOg0TotalBoostFromGuide(16, {
      techLevels: [40, 100, 85, 20, 10],
      junoExponent: 1.2,
      gains: LargeNumber.from(1e6),
      exponentDeltaMultiplier: 1.8,
    })
    const withOg0 = calculateZatBoostPerTech(16, "juno", 1.2, junoRecursive)

    expect(withOg0).toBeGreaterThan(withoutOg0)
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
  it("returns next three purchasable levels and increasing costs", () => {
    const result = calculateNextThreeTechCosts(0, 50)

    expect(result).toHaveLength(3)
    expect(result[0].level).toBe(51)
    compareLarge(result[0].cost, new LargeNumber(1, 173))
    expect(result[1].level).toBe(52)
    compareLarge(result[1].cost, new LargeNumber(1, 192))
    expect(result[2].level).toBe(53)
    compareLarge(result[2].cost, new LargeNumber(1, 211))
  })

  it("returns next three purchasable levels and increasing costs", () => {
    const result = calculateNextThreeTechCosts(5, 228)

    expect(result).toHaveLength(3)
    expect(result[0].level).toBe(229)
    compareLarge(result[0].cost, new LargeNumber(4.12, 172))
  })

  it("applies a one-time fixed bump at level 40 for LT16", () => {
    const result = calculateNextThreeTechCosts(16, 39)

    expect(result).toHaveLength(3)
    expect(result[0].level).toBe(40)
    expect(result[1].level).toBe(41)

    const ratio = result[1].cost.divide(result[0].cost)
    compareLarge(ratio, new LargeNumber(1, 80))
  })

  it("uses initCost as first purchase cost for OG16", () => {
    const fromLevel0 = calculateNextThreeTechCosts(16, 0)[0]
    const fromLevel1 = calculateNextThreeTechCosts(16, 1)[0]

    expect(fromLevel0.level).toBe(1)
    compareLarge(fromLevel0.cost, new LargeNumber(1, 170))

    expect(fromLevel1.level).toBe(2)
    compareLarge(fromLevel1.cost, new LargeNumber(1, 180))
  })

  it("returns identical results when cache is already warm", () => {
    const first = calculateNextThreeTechCosts(0, 50)
    const second = calculateNextThreeTechCosts(0, 50)

    expect(second).toHaveLength(3)
    expect(second[0].level).toBe(51)
    expect(second[1].level).toBe(52)
    expect(second[2].level).toBe(53)

    expect(second[0].cost.toString()).toBe(first[0].cost.toString())
    expect(second[1].cost.toString()).toBe(first[1].cost.toString())
    expect(second[2].cost.toString()).toBe(first[2].cost.toString())
  })
})

describe("calculateTechBoost", () => {
  it("calculates juno boost", () => {
    const result = calculateTechBoost(1.5, 0.02, 2, "juno", {
      cycles: 16,
      techLevels: [35, 150, 120, 60, 40],
      junoExponent: 1.4,
      gains: LargeNumber.from(1e6),
      exponentDeltaMultiplier: 1.7,
    })
    expect(result.rawTechBoost).toBeGreaterThan(1)
    expect(result.finalBoost).toBeGreaterThan(0)
  })

  it("calculates dc boost", () => {
    const result = calculateTechBoost(1.5, 0.02, 2, "dc", {
      cycles: 16,
      techLevels: [35, 150, 120, 60, 40],
      junoExponent: 1.4,
      gains: LargeNumber.from(1e6),
      exponentDeltaMultiplier: 1.7,
    })
    expect(result.rawTechBoost).toBeCloseTo(2.47, 2)
  })

  it("calculates OG0 contribution for non-OG0 tech when OG0 context is provided", () => {
    const result = calculateTechBoost(1.5, 0.02, 2, "juno", {
      cycles: 16,
      techLevels: [35, 150, 120, 60, 40],
      junoExponent: 1.4,
      gains: LargeNumber.from(1e6),
      exponentDeltaMultiplier: 1.7,
    })

    expect(result.rawTechBoost).toBeGreaterThan(1)
    expect(result.finalBoost).toBeGreaterThan(0)
    expect(result.og0Boost).toBeGreaterThan(0)
  })

  it("throws for OG0 direct boost calculation", () => {
    expect(() =>
      calculateTechBoost(1.5, 0.02, 0, "juno", {
        cycles: 16,
        techLevels: [35, 150, 120, 60, 40],
        junoExponent: 1.4,
        gains: LargeNumber.from(1e6),
        exponentDeltaMultiplier: 1.7,
      }),
    ).toThrow("calculateTechBoost does not support id 0")
  })
})

describe("calculateRankedTechSnapshot", () => {
  it("keeps extremely large gain rates valid via LargeNumber input", () => {
    const snapshot = calculateTechValues({
      cycles: 50,
      mode: "juno",
      junoExponent: 1.2,
      seAmount: 100,
      currentJuno: LargeNumber.from("1e500"),
      gainPerSecond: LargeNumber.from("1e400"),
      techLevels: Array.from({ length: 25 }, () => 10),
      exponentDeltaMultiplier: 1.5,
    })

    expect(snapshot.rows.length).toBeGreaterThan(0)
    expect(snapshot.rows.some((row) => Number.isFinite(row.relative))).toBe(true)
    expect(snapshot.rows.some((row) => row.etaSeconds === 0)).toBe(true)
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
  it("multiplies per-source factors and handles token split rules", () => {
    const result = calculateTotalPremiumMultiplier({
      "Juno Output": 100,
      "Juno Bundle": true,
      tokens: 1100,
    })

    expect(result).toBeCloseTo((1 + 100 * 0.02) * (1 + 0.5) * (1 + 1000 * 0.01 * 1.01 ** 100), 8)
  })
  it("handles token split rules", () => {
    const result = calculateTotalPremiumMultiplier({
      tokens: 1300,
    })

    const linearTokens = 1000
    const postTokens = 300
    const expected = 1 + linearTokens * 0.01 * 1.01 ** postTokens

    expect(result).toBeCloseTo(expected, 8)
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
