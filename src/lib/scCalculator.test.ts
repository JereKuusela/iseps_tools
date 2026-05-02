import { describe, expect, it } from "vitest"
import {
  calculateDcCostOfGoal,
  calculateProjectedScFromDc,
  calculateScMultiplierFromBattery1Dc,
  iterateCustomScGoalDcCost,
  iterateTimeToReachGoal,
} from "./scCalculator"

describe("calculateDcCostOfGoal", () => {
  it("returns increasing battery costs across battery goals", () => {
    const battery1 = calculateDcCostOfGoal({
      currentSe: 90,
      goalType: "battery1",
    })

    const battery2 = calculateDcCostOfGoal({
      currentSe: 90,
      goalType: "battery2",
    })

    const battery3 = calculateDcCostOfGoal({
      currentSe: 90,
      goalType: "battery3",
    })

    expect(battery1.dcCost.compare(battery2.dcCost)).toBe(-1)
    expect(battery2.dcCost.compare(battery3.dcCost)).toBe(-1)
  })

  it("applies cumulative SE multiplier rules", () => {
    const beforeMultiplier = calculateDcCostOfGoal({
      currentSe: 119,
      goalType: "battery1",
    })

    const atMultiplier = calculateDcCostOfGoal({
      currentSe: 120,
      goalType: "battery1",
    })

    expect(beforeMultiplier.batteryMultiplier.toString(0)).toBe("1e0")
    expect(atMultiplier.batteryMultiplier.toString(0)).toBe("1e5")
  })
})

describe("iterateCustomScGoalDcCost", () => {
  it("finds a converged DC goal for custom SC", () => {
    const result = iterateCustomScGoalDcCost({
      currentSe: 115,
      targetSc: "1e120",
    })

    const projectedSc = calculateProjectedScFromDc({
      currentSe: 115,
      projectedDc: result.dcGoal,
    })

    const ratio = projectedSc.divide("1e120")
    const ratioAsNumber = ratio.mantissa * 10 ** ratio.exponent

    expect(result.converged).toBe(true)
    expect(Math.abs(ratioAsNumber - 1)).toBeLessThan(0.01)
  })
})

describe("calculateScMultiplierFromBattery1Dc", () => {
  it("reconstructs battery 1 cost when reused as sc multiplier", () => {
    const currentSe = 130
    const battery1DcCost = "1e1500"

    const scMultiplier = calculateScMultiplierFromBattery1Dc({
      currentSe,
      battery1DcCost,
    })

    const battery1 = calculateDcCostOfGoal({
      currentSe,
      goalType: "battery1",
      scMultiplier,
    })

    const ratio = battery1.dcCost.divide(battery1DcCost)
    const ratioAsNumber = ratio.mantissa * 10 ** ratio.exponent

    expect(ratioAsNumber).toBeGreaterThan(0.999)
    expect(ratioAsNumber).toBeLessThan(1.001)
  })
})

describe("iterateTimeToReachGoal", () => {
  it("returns finite minutes when gain is positive", () => {
    const result = iterateTimeToReachGoal({
      currentSe: 120,
      goalDc: "1e200",
      currentDc: "1e180",
      dcGainPerMinute: "1e176",
      minutesInSe: 1200,
      retainedDcReplicator: 1.15,
      retainedSeReplicator: 1.1,
      futureDcBoostPct: 50,
      futureScBoostPct: 40,
      timeSkips: {
        small: 10,
        medium: 5,
        large: 2,
      },
      customDcGoal: false,
    })

    expect(Number.isFinite(result.minutes)).toBe(true)
    expect(result.minutes).toBeGreaterThanOrEqual(0)
    expect(result.projectedDcReplicator).toBeGreaterThan(1)
    expect(result.projectedScReplicator).toBeGreaterThanOrEqual(1)
  })

  it("returns infinity when gain is not positive", () => {
    const result = iterateTimeToReachGoal({
      currentSe: 100,
      goalDc: "1e40",
      currentDc: "1e30",
      dcGainPerMinute: 0,
      minutesInSe: 0,
    })

    expect(result.minutes).toBe(Number.POSITIVE_INFINITY)
  })
})
