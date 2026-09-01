import { describe, expect, it } from "vitest"
import {
  calculateDcReplicator,
  calculateGoal,
  calculateSeReplicator,
  calculateScFromDc,
  calculateScMultiplierFromGoal,
  findCustomScGoal,
  iterateTimeToReachGoal,
} from "./scCalculator"
import { LargeNumber } from "./largeNumber"

const compareLarge = (a: LargeNumber, b: LargeNumber) => {
  expect(a.mantissa).toBeCloseTo(b.mantissa, 2)
  expect(a.exponent).toEqual(b.exponent)
}

describe("calculateDcCostOfGoal", () => {
  it("returns increasing battery costs across battery goals", () => {
    const se = 90
    const battery1DcCost = new LargeNumber(1, 1000)
    const scMult = calculateScMultiplierFromGoal({ se, dc: battery1DcCost })

    const battery1 = calculateGoal({ se, type: "battery1", scMult })
    const battery2 = calculateGoal({ se, type: "battery2", scMult })
    const battery3 = calculateGoal({ se, type: "battery3", scMult })

    compareLarge(battery1.dcCost, battery1DcCost)
    compareLarge(battery2.dcCost, new LargeNumber(3.04, 1015))
    compareLarge(battery3.dcCost, new LargeNumber(2.06, 1031))
  })

  it("applies cumulative SE multiplier rules", () => {
    const scMult = new LargeNumber(1, 0)
    const beforeMultiplier = calculateGoal({ se: 119, type: "battery1", scMult })
    const beforeMultiplier2 = calculateGoal({ se: 119, type: "battery2", scMult })
    const atMultiplier = calculateGoal({ se: 120, type: "battery1", scMult })
    const atMultiplier2 = calculateGoal({ se: 120, type: "battery2", scMult })

    expect(beforeMultiplier.extraGoal).toBe(0)
    expect(beforeMultiplier2.extraGoal).toBe(5)
    expect(atMultiplier.extraGoal).toBe(5)
    expect(atMultiplier2.extraGoal).toBe(10)
  })
})

describe("iterateCustomScGoalDcCost", () => {
  it("finds a converged DC goal for custom SC", () => {
    const se = 115
    const scMult = new LargeNumber(1, 0)
    const dc = findCustomScGoal({ se, targetSc: new LargeNumber(1, 120), scMult })

    const projectedSc = calculateScFromDc({ se, dc, scMult })

    const ratio = projectedSc.divide("1e120")
    const ratioAsNumber = ratio.mantissa * 10 ** ratio.exponent

    expect(Math.abs(ratioAsNumber - 1)).toBeLessThan(0.01)
  })
})

describe("calculateScFromDc", () => {
  it("returns expected SC for SE 90 battery goals", () => {
    const se = 90
    const battery1DcCost = new LargeNumber(1, 1000)
    const scMult = calculateScMultiplierFromGoal({ se, dc: battery1DcCost })

    const battery1Goal = calculateGoal({ se, type: "battery1", scMult })
    const battery2Goal = calculateGoal({ se, type: "battery2", scMult })

    const battery1Sc = calculateScFromDc({ se, dc: battery1Goal.dcCost, scMult })
    const battery2Sc = calculateScFromDc({ se, dc: battery2Goal.dcCost, scMult })

    compareLarge(battery1Sc, new LargeNumber(1, 90))
    compareLarge(battery2Sc, new LargeNumber(9.53, 90))
  })
  it("returns expected SC for overfilled SE 150 battery", () => {
    const se = 150
    const battery1DcCost = new LargeNumber(1.99, 1167)
    const scMult = calculateScMultiplierFromGoal({ se, dc: battery1DcCost })
    const dc = new LargeNumber(2.66, 1170)
    const battery1Sc = calculateScFromDc({ se, dc, scMult })

    compareLarge(battery1Sc, new LargeNumber(4.59, 157))
  })
})

describe("iterateTimeToReachGoal", () => {
  it("works for simple case", () => {
    const result = iterateTimeToReachGoal({
      se: 90,
      goalDc: new LargeNumber(1, 1001),
      currentDc: new LargeNumber(1, 1000),
      dcGainPerMinute: new LargeNumber(6.944, 996),
      minutesInSe: 0,
      retainedDc: 1,
      retainedSc: 1,
      futureDc: 1,
      futureSc: 1,
      onlineMultiplier: 1,
      type: "battery1",
    })

    expect(result.minutes).toEqual(4101)
  })

  it("applies extra minutes-per-day percentage bonus", () => {
    const baseInput = {
      se: 100,
      goalDc: new LargeNumber(1, 500),
      currentDc: new LargeNumber(1, 490),
      dcGainPerMinute: new LargeNumber(2, 487),
      minutesInSe: 0,
      retainedDc: 1,
      retainedSc: 1,
      futureDc: 1,
      futureSc: 1,
      type: "battery1" as const,
    }

    const withoutBonus = iterateTimeToReachGoal({
      ...baseInput,
      onlineMultiplier: 1,
    })
    const withBonus = iterateTimeToReachGoal({
      ...baseInput,
      onlineMultiplier: 1.5,
    })

    expect(withBonus.minutes).toBeLessThan(withoutBonus.minutes)
  })

  it("returns finite minutes when gain is positive", () => {
    const result = iterateTimeToReachGoal({
      se: 120,
      goalDc: new LargeNumber(1, 200),
      currentDc: new LargeNumber(1, 180),
      dcGainPerMinute: new LargeNumber(1, 176),
      minutesInSe: 1200,
      retainedDc: 1.15,
      retainedSc: 1.1,
      futureDc: 1.5,
      futureSc: 1.4,
      timeSkips: 79,
      onlineMultiplier: 1.18,
      type: "battery1",
    })

    expect(Number.isFinite(result.minutes)).toBe(true)
    expect(result.minutes).toBeGreaterThanOrEqual(0)
    expect(result.dcReplicator).toBeGreaterThan(1)
    expect(result.scReplicator).toBeGreaterThanOrEqual(1)
  })
})

describe("calculateDcReplicator", () => {
  it("uses retained-only value before unlock", () => {
    const result = calculateDcReplicator(0, 719, 1.3)
    expect(result).toBeCloseTo(1.3)
  })

  it("uses SE-specific polynomial rule after unlock", () => {
    const se0 = calculateDcReplicator(0, 1000, 1.3)
    const se120 = calculateDcReplicator(120, 1000, 1.3)

    expect(se0).toBeCloseTo(1.4447, 6)
    expect(se120).toBeCloseTo(1.4504, 6)
  })
})

describe("calculateSeReplicator", () => {
  it("applies step-based growth and retained bonus", () => {
    const result = calculateSeReplicator(0, 150, 1.3)
    expect(result).toBeCloseTo(1.303, 6)
  })

  it("caps at rule cap", () => {
    const result = calculateSeReplicator(120, 10_000_000, 1.2)
    expect(result).toBe(4)
  })
})
