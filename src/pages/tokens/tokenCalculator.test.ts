import { describe, expect, it } from "vitest"
import { calculateTokenRecommendations, calculateTotalTokensSpent } from "./tokenCalculator"
import type { TokenInputState, TokenLoadedData } from "./tokenTypes"

const baseInput: TokenInputState = {
  levels: {
    "bbbot.duration": "0",
    "bbbot.tokenBonus": "0",
    "supplies.alpha": "0",
  },
  enabled: {
    "bbbot.duration": true,
    "bbbot.tokenBonus": true,
    "supplies.alpha": true,
  },
  outputLevelsByResource: {
    alpha: "1000",
  },
  blendPercent: 0.5,
  granularity: "1",
  onlineHoursPerDay: "0",
}

const testData: TokenLoadedData = {
  upgrades: [
    {
      id: "bbbot.duration",
      label: "Special A",
      group: "special",
      maxLevel: 10,
      costAnchors: [{ level: 1, cost: 10, step: 0 }],
    },
    {
      id: "bbbot.tokenBonus",
      label: "Special B",
      group: "special",
      maxLevel: 10,
      costAnchors: [{ level: 1, cost: 10, step: 0 }],
    },
    {
      id: "output.alpha",
      label: "Alpha Output",
      group: "output",
      resource: "alpha",
      maxLevel: 1800,
      costAnchors: [{ level: 1, cost: 1, step: 0 }],
    },
    {
      id: "supplies.alpha",
      label: "Alpha Supplies",
      group: "supplies",
      resource: "alpha",
      maxLevel: 300,
      costAnchors: [{ level: 1, cost: 10, step: 0 }],
    },
  ],
  rowByKey: new Map([
    [
      "bbbot.duration:1",
      {
        upgradeId: "bbbot.duration",
        level: 1,
        cost: 10,
        shortTerm: 300000,
        longTerm: 300000,
      },
    ],
    [
      "bbbot.duration:2",
      {
        upgradeId: "bbbot.duration",
        level: 2,
        cost: 10,
        shortTerm: 250000,
        longTerm: 250000,
      },
    ],
    [
      "bbbot.duration:3",
      {
        upgradeId: "bbbot.duration",
        level: 3,
        cost: 10,
        shortTerm: 50000,
        longTerm: 50000,
      },
    ],
    [
      "bbbot.tokenBonus:1",
      {
        upgradeId: "bbbot.tokenBonus",
        level: 1,
        cost: 10,
        shortTerm: 100000,
        longTerm: 100000,
      },
    ],
    [
      "output.alpha:1001",
      {
        upgradeId: "output.alpha",
        level: 1001,
        cost: 2000,
        shortTerm: 1000,
        longTerm: 1000,
      },
    ],
    [
      "output.alpha:1050",
      {
        upgradeId: "output.alpha",
        level: 1050,
        cost: 140,
        shortTerm: 14286,
        longTerm: 14286,
      },
    ],
    [
      "output.alpha:1100",
      {
        upgradeId: "output.alpha",
        level: 1100,
        cost: 50,
        shortTerm: 2000,
        longTerm: 2000,
      },
    ],
    [
      "supplies.alpha:1",
      {
        upgradeId: "supplies.alpha",
        level: 1,
        cost: 10,
        shortTerm: 50000,
        longTerm: 50000,
      },
    ],
  ]),
}

describe("calculateTokenRecommendations", () => {
  it("allows non-output recommendations when values are competitive", () => {
    const gatedInput: TokenInputState = {
      ...baseInput,
      outputLevelsByResource: {
        cash: "50",
        alpha: "50",
      },
      levels: {
        ...baseInput.levels,
        "bbbot.duration": "0",
      },
    }

    const gatedData: TokenLoadedData = {
      upgrades: [
        {
          id: "output.cash",
          label: "Cash Output",
          group: "output",
          resource: "cash",
          maxLevel: 500,
          costAnchors: [{ level: 1, cost: 1, step: 0 }],
        },
        {
          id: "output.alpha",
          label: "Alpha Output",
          group: "output",
          resource: "alpha",
          maxLevel: 500,
          costAnchors: [{ level: 1, cost: 1, step: 0 }],
        },
        {
          id: "bbbot.duration",
          label: "Special A",
          group: "special",
          maxLevel: 10,
          costAnchors: [{ level: 1, cost: 10, step: 0 }],
        },
      ],
      rowByKey: new Map([
        [
          "output.cash:51",
          {
            upgradeId: "output.cash",
            level: 51,
            cost: 1,
            shortTerm: 100000,
            longTerm: 100000,
          },
        ],
        [
          "output.alpha:51",
          {
            upgradeId: "output.alpha",
            level: 51,
            cost: 1,
            shortTerm: 100000,
            longTerm: 100000,
          },
        ],
        [
          "bbbot.duration:1",
          {
            upgradeId: "bbbot.duration",
            level: 1,
            cost: 10,
            shortTerm: 999999,
            longTerm: 999999,
          },
        ],
      ]),
    }

    const result = calculateTokenRecommendations(gatedInput, gatedData)

    expect(result.best?.id).toBe("bbbot.duration")
  })

  it("keeps special scores stable across output-level changes", () => {
    const completeOutputLevels = {
      cash: "100",
      alpha: "100",
      beta: "100",
      ceti: "100",
      delta: "100",
      epsilon: "100",
      fenix: "100",
      gamma: "100",
      helion: "100",
      ixion: "100",
      juno: "100",
      kappa: "100",
    }

    const lopsidedOutputLevels = {
      ...completeOutputLevels,
      cash: "10",
      beta: "10",
      ceti: "10",
      delta: "10",
      epsilon: "10",
      fenix: "10",
      gamma: "10",
      helion: "10",
    }

    const multiSourceInput: TokenInputState = {
      ...baseInput,
      onlineHoursPerDay: "10",
      outputLevelsByResource: completeOutputLevels,
      levels: {
        ...baseInput.levels,
        "supplies.tokenBonus": "0",
      },
      enabled: {
        ...baseInput.enabled,
        "supplies.tokenBonus": true,
      },
    }

    const multiSourceData: TokenLoadedData = {
      upgrades: [
        {
          id: "supplies.tokenBonus",
          label: "Supplies Extra Tokens",
          group: "special",
          maxLevel: 10,
          costAnchors: [{ level: 1, cost: 10, step: 0 }],
        },
      ],
      rowByKey: new Map([
        [
          "supplies.tokenBonus:1",
          {
            upgradeId: "supplies.tokenBonus",
            level: 1,
            cost: 10,
            shortTerm: 100000,
            longTerm: 100000,
          },
        ],
      ]),
    }

    const balanced = calculateTokenRecommendations(multiSourceInput, multiSourceData)
    const lopsided = calculateTokenRecommendations(
      {
        ...multiSourceInput,
        outputLevelsByResource: lopsidedOutputLevels,
      },
      multiSourceData,
    )

    expect(balanced.best?.score ?? 0).toBeCloseTo(lopsided.best?.score ?? 0)
  })

  it("ranks by weighted value per cost", () => {
    const result = calculateTokenRecommendations(baseInput, testData)
    expect(result.best?.id).toBe("bbbot.duration")
    expect(result.rows[0]?.score).toBeGreaterThan(result.rows[1]?.score ?? 0)
  })

  it("merges later output blocks into the original recommendation", () => {
    const result = calculateTokenRecommendations(
      {
        ...baseInput,
        granularity: "50",
      },
      testData,
    )

    const outputRows = result.rows.filter((row) => row.id === "output.alpha")
    const outputRow = outputRows[0]

    expect(outputRows).toHaveLength(1)
    expect(outputRow?.currentLevel).toBe(1000)
    expect(outputRow?.nextLevel ?? 0).toBe(1001)
    expect(outputRow?.cost ?? 0).toBe(2000)
  })

  it("merges sequential top recommendations but keeps first-step value", () => {
    const result = calculateTokenRecommendations(baseInput, testData)

    const specialRow = result.rows.find((row) => row.id === "bbbot.duration")
    expect(specialRow?.nextLevel).toBe(2)
    expect(specialRow?.cost).toBe(20)
  })

  it("scales supplies scores by online hours", () => {
    const baseline = calculateTokenRecommendations(
      {
        ...baseInput,
        onlineHoursPerDay: "0",
      },
      testData,
    )

    const boosted = calculateTokenRecommendations(
      {
        ...baseInput,
        onlineHoursPerDay: "10",
      },
      testData,
    )

    const baselineSupplies = baseline.rows.find((row) => row.id === "supplies.alpha")
    const boostedSupplies = boosted.rows.find((row) => row.id === "supplies.alpha")

    expect(boostedSupplies?.score ?? 0).toBeGreaterThan(baselineSupplies?.score ?? 0)
  })

  it("caps supplies online-hours bonus at 10 hours per day", () => {
    const atTenHours = calculateTokenRecommendations(
      {
        ...baseInput,
        onlineHoursPerDay: "10",
      },
      testData,
    )

    const atTwentyFourHours = calculateTokenRecommendations(
      {
        ...baseInput,
        onlineHoursPerDay: "24",
      },
      testData,
    )

    const tenHoursSupplies = atTenHours.rows.find((row) => row.id === "supplies.alpha")
    const twentyFourHoursSupplies = atTwentyFourHours.rows.find((row) => row.id === "supplies.alpha")

    expect(twentyFourHoursSupplies?.score).toBeCloseTo(tenHoursSupplies?.score ?? 0)
  })

  it("calculates total spent from current levels", () => {
    const result = calculateTotalTokensSpent(baseInput, testData)
    expect(result).toBe(1000)
  })

  it("floors and caps levels when calculating total spent", () => {
    const result = calculateTotalTokensSpent(
      {
        ...baseInput,
        levels: {
          ...baseInput.levels,
          "bbbot.duration": "12.8",
        },
        outputLevelsByResource: {
          ...baseInput.outputLevelsByResource,
          alpha: "2.7",
        },
      },
      testData,
    )

    expect(result).toBe(102)
  })
})
