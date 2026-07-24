import { describe, expect, it } from "vitest"
import {
  calculateBuild,
  evaluateNextNodeValues,
  getBuildScore,
  getNodeCostAtLevel,
  getSpentPoints,
  getTotalPointsFromPrestiges,
} from "./factoryCalculator"
import { FACTORY_NODE_DEFINITIONS, emptyFactoryNodeLevels, type FactoryInputState } from "./factoryTypes"

const defaultInput = (): FactoryInputState => ({
  prestigesDone: 25,
  totalParticleLevel: 500,
  productionWeightPercent: 10,
  particleWeightPercent: 0,
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
  it("matches fabricator output breakpoints", () => {
    expect(getNodeCostAtLevel("fabricatorOutput", 1)).toBe(1)
    expect(getNodeCostAtLevel("fabricatorOutput", 20)).toBe(1)
    expect(getNodeCostAtLevel("fabricatorOutput", 21)).toBe(2)
    expect(getNodeCostAtLevel("fabricatorOutput", 30)).toBe(2)
    expect(getNodeCostAtLevel("fabricatorOutput", 31)).toBe(3)
  })

  it("matches listed array costs", () => {
    expect(getNodeCostAtLevel("sellValue", 1)).toBe(2)
    expect(getNodeCostAtLevel("sellValue", 50)).toBe(132)
    expect(getNodeCostAtLevel("particleOutput", 1)).toBe(5)
    expect(getNodeCostAtLevel("particleOutput", 5)).toBe(174)
    expect(getNodeCostAtLevel("fabricatorSpeed", 19)).toBe(100)
    expect(getNodeCostAtLevel("maxOfflineTimeCap", 16)).toBe(1)
  })
})

describe("unlock gating", () => {
  it("requires first fabricator output level before other nodes", () => {
    const levels = emptyFactoryNodeLevels()
    const evaluation = evaluateNextNodeValues(defaultInput(), levels)

    const locked = evaluation.rows.filter((row) => row.id !== "fabricatorOutput")
    expect(locked.every((row) => row.unlocked === false)).toBe(true)

    levels.fabricatorOutput = 1
    const unlockedEvaluation = evaluateNextNodeValues(defaultInput(), levels)
    const nowUnlocked = unlockedEvaluation.rows.filter((row) => row.id !== "fabricatorOutput")
    expect(nowUnlocked.every((row) => row.unlocked)).toBe(true)
  })
})

describe("weighting", () => {
  it("increases particle node valuation when particle weight is raised", () => {
    const levels = emptyFactoryNodeLevels()
    levels.fabricatorOutput = 1

    const lowWeight = evaluateNextNodeValues(
      {
        ...defaultInput(),
        particleWeightPercent: -30,
      },
      levels,
    )
    const highWeight = evaluateNextNodeValues(
      {
        ...defaultInput(),
        particleWeightPercent: 30,
      },
      levels,
    )

    const lowParticle = lowWeight.rows.find((row) => row.id === "particleOutput")
    const highParticle = highWeight.rows.find((row) => row.id === "particleOutput")

    expect((highParticle?.nextBonusPerPoint ?? 0) > (lowParticle?.nextBonusPerPoint ?? 0)).toBe(true)
  })
})

describe("evaluation", () => {
  it("does not recommend maxOfflineTimeCap when it has no value", () => {
    const levels = emptyFactoryNodeLevels()
    for (const definition of FACTORY_NODE_DEFINITIONS) {
      levels[definition.id] = definition.maxLevel
    }
    levels.maxOfflineTimeCap = Math.max(0, levels.maxOfflineTimeCap - 1)

    const evaluation = evaluateNextNodeValues(defaultInput(), levels)
    const offlineRow = evaluation.rows.find((row) => row.id === "maxOfflineTimeCap")

    expect(offlineRow?.nextCost).toBe(1)
    expect(offlineRow?.nextBonusPerPoint).toBe(0)
    expect(evaluation.bestNodeId).toBeNull()
  })
})

describe("optimize", () => {
  it("stays within budget and improves from baseline", () => {
    const input = {
      ...defaultInput(),
      prestigesDone: 30,
      totalParticleLevel: 800,
    }

    const baseline = emptyFactoryNodeLevels()
    const baselineScore = getBuildScore(input, baseline)

    const optimized = calculateBuild(input, baseline)
    const spent = getSpentPoints(optimized.levels)

    expect(spent).toBeLessThanOrEqual(getTotalPointsFromPrestiges(input.prestigesDone))
    expect(optimized.score).toBeGreaterThanOrEqual(baselineScore)
  })
})
