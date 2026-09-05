import { describe, expect, it } from "vitest"
import {
  calculateBuild,
  evaluateNextNodeValues,
  getBuildScore,
  getNodeCostAtLevel,
  getSpentPoints,
  getTotalPointsFromPrestiges,
} from "./factoryCalculator"
import { FACTORY_NODE_DEFINITIONS, emptyFactoryNodeLevels, type FactoryInputState, type FactoryNodeLevels } from "./factoryTypes"

const defaultInput = (): FactoryInputState => ({
  prestigesDone: 25,
  totalParticleLevel: 500,
  productionWeightPercent: 10,
  particleWeightMultiplier: 1,
})

const calculateGreedyOnlyBuild = (input: FactoryInputState, startingLevels: FactoryNodeLevels = emptyFactoryNodeLevels()) => {
  const levels = { ...startingLevels }

  let iterations = 0
  while (iterations < 10000) {
    iterations += 1
    const evaluation = evaluateNextNodeValues(input, levels)
    if (!evaluation.bestNodeId) break

    const row = evaluation.rows.find((entry) => entry.id === evaluation.bestNodeId)
    if (!row?.nextCost || row.nextBonusPerPoint <= 0) break

    levels[evaluation.bestNodeId] += 1
  }

  return {
    levels,
    score: getBuildScore(input, levels),
  }
}

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
    expect(getNodeCostAtLevel("particleOutput", 5)).toBe(86)
    expect(getNodeCostAtLevel("fabricatorSpeed", 19)).toBe(100)
    expect(getNodeCostAtLevel("maxOfflineTimeCap", 16)).toBe(1)
  })
})

describe("unlock gating", () => {
  it("keeps all nodes unlocked", () => {
    const levels = emptyFactoryNodeLevels()
    const evaluation = evaluateNextNodeValues(defaultInput(), levels)

    expect(evaluation.rows.every((row) => row.unlocked)).toBe(true)
  })
})

describe("weighting", () => {
  it("increases particle node valuation when particle weight is raised", () => {
    const levels = emptyFactoryNodeLevels()
    levels.fabricatorOutput = 1

    const lowWeight = evaluateNextNodeValues(
      {
        ...defaultInput(),
        particleWeightMultiplier: 0.125,
      },
      levels,
    )
    const highWeight = evaluateNextNodeValues(
      {
        ...defaultInput(),
        particleWeightMultiplier: 8,
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

  it("can beat the original greedy path by forcing higher particle output targets", () => {
    const input: FactoryInputState = {
      prestigesDone: 8,
      totalParticleLevel: 150,
      productionWeightPercent: 0,
      particleWeightMultiplier: 8,
    }

    const greedy = calculateGreedyOnlyBuild(input)
    const hybrid = calculateBuild(input, emptyFactoryNodeLevels())

    expect(hybrid.score).toBeGreaterThan(greedy.score)
    expect(hybrid.levels.particleOutput).toBeGreaterThan(greedy.levels.particleOutput)
  })

  it("can beat the original greedy path by forcing higher fabricator speed targets", () => {
    const input: FactoryInputState = {
      prestigesDone: 16,
      totalParticleLevel: 100,
      productionWeightPercent: 35,
      particleWeightMultiplier: 0.125,
    }

    const greedy = calculateGreedyOnlyBuild(input)
    const hybrid = calculateBuild(input, emptyFactoryNodeLevels())

    expect(hybrid.score).toBeGreaterThan(greedy.score)
    expect(hybrid.levels.fabricatorSpeed).toBeGreaterThan(greedy.levels.fabricatorSpeed)
  })

  it("can still improve from non-zero starting levels without losing purchased levels", () => {
    const input: FactoryInputState = {
      prestigesDone: 8,
      totalParticleLevel: 150,
      productionWeightPercent: 0,
      particleWeightMultiplier: 8,
    }
    const startingLevels: FactoryNodeLevels = {
      ...emptyFactoryNodeLevels(),
      fabricatorOutput: 3,
    }

    const greedy = calculateGreedyOnlyBuild(input, startingLevels)
    const hybrid = calculateBuild(input, startingLevels)

    expect(hybrid.score).toBeGreaterThan(greedy.score)
    expect(hybrid.levels.fabricatorOutput).toBeGreaterThanOrEqual(startingLevels.fabricatorOutput)
    expect(hybrid.levels.sellValue).toBeGreaterThanOrEqual(startingLevels.sellValue)
    expect(hybrid.levels.particleOutput).toBeGreaterThanOrEqual(startingLevels.particleOutput)
    expect(hybrid.levels.fabricatorSpeed).toBeGreaterThanOrEqual(startingLevels.fabricatorSpeed)
    expect(hybrid.levels.maxOfflineTimeCap).toBeGreaterThanOrEqual(startingLevels.maxOfflineTimeCap)
  })
})
