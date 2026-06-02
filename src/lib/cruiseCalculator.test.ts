import { describe, expect, it } from "vitest"
import {
  applyActionOptimize,
  applyActionSpendAll,
  evaluateNextNodeValues,
  getAvailablePoints,
  getNodeCostAtLevel,
  getCruiseSnapshot,
  getSpentPoints,
  getTotalPointsFromPrestiges,
  isEchoUnlocked,
} from "./cruiseCalculator"
import { emptyCruiseNodeLevels, type CruiseInputState } from "../pages/cruise/cruiseTypes"

const defaultInput = (): CruiseInputState => ({
  prestigesDone: 25,
  cruiseLevel: 24,
  ticketPrice: 100,
  guestSpendingMin: 20,
  guestSpendingMax: 40,
  roomCapacityMin: 10,
  roomCapacityMax: 14,
  groupsDiscountLevel: 0,
  bunkBedsLevel: 0,
})

describe("getTotalPointsFromPrestiges", () => {
  it("uses triangular progression", () => {
    expect(getTotalPointsFromPrestiges(1)).toBe(1)
    expect(getTotalPointsFromPrestiges(2)).toBe(3)
    expect(getTotalPointsFromPrestiges(3)).toBe(6)
    expect(getTotalPointsFromPrestiges(25)).toBe(325)
  })
})

describe("getNodeCostAtLevel", () => {
  it("matches prestige multiplier breakpoints", () => {
    expect(getNodeCostAtLevel("prestigeMultiplier", 1)).toBe(1)
    expect(getNodeCostAtLevel("prestigeMultiplier", 10)).toBe(2)
    expect(getNodeCostAtLevel("prestigeMultiplier", 11)).toBe(3)
    expect(getNodeCostAtLevel("prestigeMultiplier", 99)).toBe(11)
  })

  it("matches ticket and guest high-level jumps", () => {
    expect(getNodeCostAtLevel("ticketPrice", 1)).toBe(2)
    expect(getNodeCostAtLevel("ticketPrice", 21)).toBe(42)
    expect(getNodeCostAtLevel("ticketPrice", 22)).toBe(64)
    expect(getNodeCostAtLevel("ticketPrice", 25)).toBe(130)

    expect(getNodeCostAtLevel("guestSpending", 22)).toBe(64)
    expect(getNodeCostAtLevel("guestSpending", 25)).toBe(130)
  })

  it("matches echo costs", () => {
    expect(getNodeCostAtLevel("echoTriggerCount", 1)).toBe(40)
    expect(getNodeCostAtLevel("echoTriggerCount", 5)).toBe(80)
    expect(getNodeCostAtLevel("echoMultiplier", 1)).toBe(30)
    expect(getNodeCostAtLevel("echoMultiplier", 40)).toBe(30)
  })
})

describe("point accounting", () => {
  it("calculates spent and available points", () => {
    const levels = emptyCruiseNodeLevels()
    levels.prestigeMultiplier = 3
    levels.ticketPrice = 2

    const spent = getSpentPoints(levels)
    expect(spent).toBe(11)

    const available = getAvailablePoints(
      {
        ...defaultInput(),
        prestigesDone: 5,
      },
      levels,
    )

    expect(getTotalPointsFromPrestiges(5)).toBe(15)
    expect(available).toBe(4)
  })
})

describe("echo gating", () => {
  it("unlocks echo with cruise level or prestige count", () => {
    expect(isEchoUnlocked({ ...defaultInput(), cruiseLevel: 24, prestigesDone: 0 })).toBe(true)
    expect(isEchoUnlocked({ ...defaultInput(), cruiseLevel: 1, prestigesDone: 25 })).toBe(true)
    expect(isEchoUnlocked({ ...defaultInput(), cruiseLevel: 23, prestigesDone: 24 })).toBe(false)
  })

  it("applies cruise-level echo trigger and multiplier bonuses", () => {
    const noNodes = emptyCruiseNodeLevels()
    const baseInput = {
      ...defaultInput(),
      prestigesDone: 25,
    }

    const echoFactorAt = (cruiseLevel: number) => {
      const snapshot = getCruiseSnapshot({ ...baseInput, cruiseLevel }, noNodes)
      return snapshot.objectiveMultiplier
    }

    expect(echoFactorAt(23)).toBeCloseTo(1, 10)
    expect(echoFactorAt(24)).toBeCloseTo(1.14, 10)
    expect(echoFactorAt(39)).toBeCloseTo(1.34 ** 2, 10)
    expect(echoFactorAt(49)).toBeCloseTo(1.45 ** 2, 10)
  })
})

describe("snapshot ticket price handling", () => {
  it("derives base values from effective inputs", () => {
    const levels = emptyCruiseNodeLevels()
    levels.ticketPrice = 1
    levels.guestSpending = 2
    levels.moreSpace = 3

    const snapshot = getCruiseSnapshot(
      {
        ...defaultInput(),
        ticketPrice: 10,
        guestSpendingMin: 20,
        guestSpendingMax: 40,
        roomCapacityMin: 50,
        roomCapacityMax: 70,
        groupsDiscountLevel: 1,
        bunkBedsLevel: 2,
      },
      levels,
    )

    expect(snapshot.effectiveTicketPrice).toBeCloseTo(10, 10)
    expect(snapshot.baseTicketPrice).toBeCloseTo(10 / 1.4, 10)
    expect(snapshot.effectiveGuestSpending).toBeCloseTo(30, 10)
    expect(snapshot.baseGuestMin).toBeCloseTo(20 / 1.35 ** 2, 10)
    expect(snapshot.baseGuestMax).toBeCloseTo(40 / 1.35 ** 2, 10)

    const sunMultiplier = 1.08 * 1.05 ** 2
    expect(snapshot.effectiveRoomCapacity).toBeCloseTo(60, 10)
    expect(snapshot.baseRoomMin).toBeCloseTo(50 / sunMultiplier - 3, 10)
    expect(snapshot.baseRoomMax).toBeCloseTo(70 / sunMultiplier - 3, 10)
  })
})

describe("evaluation", () => {
  it("keeps only prestige multiplier unlocked before 2 fills", () => {
    const levels = emptyCruiseNodeLevels()
    const input = {
      ...defaultInput(),
      prestigesDone: 1,
      cruiseLevel: 1,
    }

    const evaluation = evaluateNextNodeValues(input, levels)
    const unlockedRows = evaluation.rows.filter((row) => row.unlocked)

    expect(unlockedRows).toHaveLength(1)
    expect(unlockedRows[0]?.id).toBe("prestigeMultiplier")
  })

  it("keeps more space locked before cruise level 7", () => {
    const levels = emptyCruiseNodeLevels()
    const input = {
      ...defaultInput(),
      prestigesDone: 10,
      cruiseLevel: 6,
    }

    const evaluation = evaluateNextNodeValues(input, levels)
    const moreSpace = evaluation.rows.find((row) => row.id === "moreSpace")

    expect(moreSpace?.unlocked).toBe(false)
  })

  it("unlocks echo trigger count at cruise level 24 even below 25 fills", () => {
    const levels = emptyCruiseNodeLevels()
    const input = {
      ...defaultInput(),
      prestigesDone: 24,
      cruiseLevel: 24,
    }

    const evaluation = evaluateNextNodeValues(input, levels)
    const echoTrigger = evaluation.rows.find((row) => row.id === "echoTriggerCount")
    expect(echoTrigger?.unlocked).toBe(true)
  })

  it("unlocks echo multiplier at the first echo-trigger cruise level", () => {
    const levels = emptyCruiseNodeLevels()
    const input = {
      ...defaultInput(),
      prestigesDone: 0,
      cruiseLevel: 24,
    }

    const evaluation = evaluateNextNodeValues(input, levels)
    const echoMultiplier = evaluation.rows.find((row) => row.id === "echoMultiplier")

    expect(echoMultiplier?.unlocked).toBe(true)
  })

  it("keeps echo trigger count locked below level 24 and below 25 fills", () => {
    const levels = emptyCruiseNodeLevels()
    const input = {
      ...defaultInput(),
      prestigesDone: 24,
      cruiseLevel: 23,
    }

    const evaluation = evaluateNextNodeValues(input, levels)
    const echoTrigger = evaluation.rows.find((row) => row.id === "echoTriggerCount")

    expect(echoTrigger?.unlocked).toBe(false)
  })

  it("unlocks echo multiplier when echo trigger has levels", () => {
    const levels = emptyCruiseNodeLevels()
    levels.echoTriggerCount = 1

    const input = {
      ...defaultInput(),
      prestigesDone: 0,
      cruiseLevel: 1,
    }

    const evaluation = evaluateNextNodeValues(input, levels)
    const echoMultiplier = evaluation.rows.find((row) => row.id === "echoMultiplier")

    expect(echoMultiplier?.unlocked).toBe(true)
  })

  it("provides ranked rows", () => {
    const levels = emptyCruiseNodeLevels()
    const input = {
      ...defaultInput(),
      prestigesDone: 20,
      cruiseLevel: 24,
    }

    const evaluation = evaluateNextNodeValues(input, levels)

    expect(evaluation.rows.length).toBe(9)

    expect(evaluation.bestNodeId).not.toBeNull()
  })

  it("spend-all improves objective multiplier", () => {
    const input = {
      ...defaultInput(),
      prestigesDone: 50,
      cruiseLevel: 24,
      ticketPrice: 220,
      guestSpendingMin: 70,
      guestSpendingMax: 90,
    }

    const baseline = evaluateNextNodeValues(input, emptyCruiseNodeLevels()).snapshot.objectiveMultiplier
    const spentAll = applyActionSpendAll(input, emptyCruiseNodeLevels())
    const improved = evaluateNextNodeValues(input, spentAll.nextLevels).snapshot.objectiveMultiplier

    expect(improved).toBeGreaterThanOrEqual(baseline)
  })
})

describe("optimize", () => {
  it("optimizes from a clean slate", () => {
    const input = {
      ...defaultInput(),
      prestigesDone: 16,
      cruiseLevel: 25,
    }

    const optimized = applyActionOptimize(input)
    const spent = getSpentPoints(optimized.nextLevels)

    expect(spent).toBeLessThanOrEqual(getTotalPointsFromPrestiges(16))
  })
})
