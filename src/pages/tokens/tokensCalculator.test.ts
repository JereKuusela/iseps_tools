import { describe, expect, it } from "vitest"
import {
  calculateTokenRecommendations,
  calculateTokenSpendingReport,
  calculateTotalTokensSpent,
  formatTokenRequirement,
  getTokenUnmetRequirements,
} from "./tokensCalculator"
import { loadTokenData, TOKEN_UPGRADES } from "./tokensData"
import type { TokenInputState, TokenLoadedData } from "./tokensTypes"

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
  tokensPerStep: "0",
  onlineHoursPerDay: "0",
}

// Mirrors the generated CSV: one row per level with running accumulated cost; unspecified rows have zero value.
const withFullLevelRows = (data: TokenLoadedData): TokenLoadedData => {
  const rowByKey = new Map(data.rowByKey)
  for (const upgrade of data.upgrades) {
    let accumulatedCost = 0
    for (let level = 1; level <= upgrade.maxLevel; level += 1) {
      const key = `${upgrade.id}:${level}`
      const existing = rowByKey.get(key)
      const cost = existing?.cost ?? upgrade.costAnchors[0].cost
      accumulatedCost += cost
      rowByKey.set(key, {
        upgradeId: upgrade.id,
        level,
        value: 0,
        ...existing,
        cost,
        accumulatedCost,
      })
    }
  }
  return { upgrades: data.upgrades, rowByKey }
}

const testData: TokenLoadedData = withFullLevelRows({
  upgrades: [
    {
      id: "bbbot.duration",
      label: "BB-Bot Duration",
      group: "special",
      maxLevel: 10,
      costAnchors: [{ level: 1, cost: 10, step: 0 }],
    },
    {
      id: "bbbot.cash",
      label: "Cash BB-Bot",
      group: "bbbot",
      maxLevel: 10,
      costAnchors: [{ level: 1, cost: 10, step: 0 }],
    },
    {
      id: "bbbot.alpha",
      label: "Alpha BB-Bot",
      group: "bbbot",
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
      "bbbot.cash:1",
      {
        upgradeId: "bbbot.cash",
        level: 1,
        cost: 10,
        accumulatedCost: 10,
        value: 300000,
      },
    ],
    [
      "bbbot.cash:2",
      {
        upgradeId: "bbbot.cash",
        level: 2,
        cost: 10,
        accumulatedCost: 20,
        value: 250000,
      },
    ],
    [
      "bbbot.cash:3",
      {
        upgradeId: "bbbot.cash",
        level: 3,
        cost: 10,
        accumulatedCost: 30,
        value: 50000,
      },
    ],
    [
      "bbbot.alpha:1",
      {
        upgradeId: "bbbot.alpha",
        level: 1,
        cost: 10,
        accumulatedCost: 10,
        value: 100000,
      },
    ],
    [
      "output.alpha:1001",
      {
        upgradeId: "output.alpha",
        level: 1001,
        cost: 2000,
        accumulatedCost: 3000,
        value: 1000,
      },
    ],
    [
      "output.alpha:1050",
      {
        upgradeId: "output.alpha",
        level: 1050,
        cost: 140,
        accumulatedCost: 4000,
        value: 14286,
      },
    ],
    [
      "output.alpha:1100",
      {
        upgradeId: "output.alpha",
        level: 1100,
        cost: 50,
        accumulatedCost: 4500,
        value: 2000,
      },
    ],
    [
      "supplies.alpha:1",
      {
        upgradeId: "supplies.alpha",
        level: 1,
        cost: 10,
        accumulatedCost: 10,
        value: 50000,
      },
    ],
  ]),
})

describe("token resource unlock requirements", () => {
  it("filters recommendations using data-backed SE requirements", () => {
    const data = withFullLevelRows({
      upgrades: TOKEN_UPGRADES.filter((upgrade) =>
        ["supplies.gamma", "supplies.helion", "bbbot.gamma", "bbbot.helion"].includes(upgrade.id),
      ),
      rowByKey: new Map(),
    })
    const idsAt = (se: number) =>
      calculateTokenRecommendations({ ...baseInput, se }, data)
        .rows.map((row) => row.id)
        .sort()
    expect(idsAt(79)).toEqual([])
    expect(idsAt(80)).toEqual(["bbbot.helion", "supplies.helion"])
    expect(idsAt(90)).toEqual(["bbbot.gamma", "bbbot.helion", "supplies.gamma", "supplies.helion"])
  })
  it("unlocks Gamma at SE90 and Helion at SE80", () => {
    for (const group of ["supplies", "bbbot"]) {
      for (const [resource, se] of [
        ["gamma", 90],
        ["helion", 80],
      ] as const) {
        const upgrade = TOKEN_UPGRADES.find((candidate) => candidate.id === `${group}.${resource}`)!
        const unmet = getTokenUnmetRequirements(upgrade, { ...baseInput, se: se - 1 })
        expect(unmet).toEqual([{ type: "se", minimum: se }])
        expect(unmet.map((requirement) => formatTokenRequirement(requirement, TOKEN_UPGRADES))).toEqual([
          `Requires SE${se}`,
        ])
        expect(getTokenUnmetRequirements(upgrade, { ...baseInput, se })).toEqual([])
      }
    }
  })
  it("describes missing particle and upgrade requirements", () => {
    const output = TOKEN_UPGRADES.find((upgrade) => upgrade.id === "output.gamma")!
    const outputUnmet = getTokenUnmetRequirements(output, { ...baseInput, unlockedParticle: "alpha" })
    expect(outputUnmet).toEqual([{ type: "particle", resource: "gamma" }])
    expect(outputUnmet.map((requirement) => formatTokenRequirement(requirement, TOKEN_UPGRADES))).toEqual([
      "Unlock Gamma",
    ])
    const bonus = TOKEN_UPGRADES.find((upgrade) => upgrade.id === "bbbot.tokenBonus")!
    const bonusUnmet = getTokenUnmetRequirements(bonus, baseInput)
    expect(bonusUnmet).toEqual([{ type: "upgrade", id: "bbbot.duration", minimum: 40 }])
    expect(bonusUnmet.map((requirement) => formatTokenRequirement(requirement, TOKEN_UPGRADES))).toEqual([
      "Requires BB-Bot Duration level 40",
    ])
    expect(
      getTokenUnmetRequirements(bonus, {
        ...baseInput,
        levels: { "bbbot.duration": "40" },
      }),
    ).toEqual([])
  })
})

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
          id: "supplies.tokenBonus",
          label: "Supplies Tokens",
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
            accumulatedCost: 51,
            value: 100000,
          },
        ],
        [
          "output.alpha:51",
          {
            upgradeId: "output.alpha",
            level: 51,
            cost: 1,
            accumulatedCost: 51,
            value: 100000,
          },
        ],
        [
          "supplies.tokenBonus:1",
          {
            upgradeId: "supplies.tokenBonus",
            level: 1,
            cost: 10,
            accumulatedCost: 10,
            value: 999999,
          },
        ],
      ]),
    }

    const result = calculateTokenRecommendations(gatedInput, gatedData)

    expect(result.best?.id).toBe("supplies.tokenBonus")
    expect(result.bestSpecial).toBeNull()
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
            accumulatedCost: 10,
            value: 100000,
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
    expect(result.best?.id).toBe("bbbot.cash")
    expect(result.rows[0]?.score).toBeGreaterThan(result.rows[1]?.score ?? 0)
  })

  it("groups levels into fixed token-cost buckets", () => {
    const input: TokenInputState = {
      ...baseInput,
      levels: { ...baseInput.levels, "supplies.alpha": "0" },
      enabled: { "supplies.alpha": true },
      outputLevelsByResource: {},
      tokensPerStep: "25",
    }
    const data = withFullLevelRows({
      upgrades: [
        {
          id: "supplies.alpha",
          label: "Alpha Supplies",
          group: "supplies",
          resource: "alpha",
          maxLevel: 10,
          costAnchors: [{ level: 1, cost: 10, step: 0 }],
        },
      ],
      rowByKey: new Map(),
    })

    // Accumulated cost 10, 20, 30...: bucket 1 ends at level 2 (20 <= 25).
    const first = calculateTokenRecommendations(input, data).best
    expect(first?.nextLevel).toBe(2)
    expect(first?.cost).toBe(20)

    // Inside the same bucket the target stays fixed.
    const second = calculateTokenRecommendations({ ...input, levels: { "supplies.alpha": "1" } }, data).best
    expect(second?.nextLevel).toBe(2)
    expect(second?.cost).toBe(10)

    const third = calculateTokenRecommendations({ ...input, levels: { "supplies.alpha": "2" } }, data).best
    expect(third?.nextLevel).toBe(5)
  })

  it("gives a level costing more than the budget its own bucket", () => {
    const input: TokenInputState = {
      ...baseInput,
      levels: { "supplies.alpha": "0" },
      enabled: { "supplies.alpha": true },
      outputLevelsByResource: {},
      tokensPerStep: "5",
    }
    const data = withFullLevelRows({
      upgrades: [
        {
          id: "supplies.alpha",
          label: "Alpha Supplies",
          group: "supplies",
          resource: "alpha",
          maxLevel: 10,
          costAnchors: [{ level: 1, cost: 10, step: 0 }],
        },
      ],
      rowByKey: new Map(),
    })

    expect(calculateTokenRecommendations(input, data).best?.nextLevel).toBe(1)
  })

  it("buckets output levels above 1000 as well", () => {
    const input: TokenInputState = {
      ...baseInput,
      levels: {},
      enabled: {},
      outputLevelsByResource: { alpha: "1000" },
      tokensPerStep: "5000",
    }
    const result = calculateTokenRecommendations(input, testData)
    const row = result.rows.find((candidate) => candidate.id === "output.alpha")

    expect(row?.currentLevel).toBe(1000)
    expect((row?.nextLevel ?? 0) > 1001).toBe(true)
  })

  it("merges sequential top recommendations but keeps first-step value", () => {
    const result = calculateTokenRecommendations(baseInput, testData)

    const row = result.rows.find((candidate) => candidate.id === "bbbot.cash")
    expect(row?.nextLevel).toBe(2)
    expect(row?.cost).toBe(20)
  })

  it.each([0, 2])("uses rank tie-breakers when grouping Alpha Output at Cash level %i", async (cashLevel) => {
    const data = await loadTokenData()
    const upgrades = data.upgrades
      .filter(({ id }) => id === "output.alpha" || id === "output.cash" || id === "output.beta")
      .map((upgrade) => ({
        ...upgrade,
        maxLevel: upgrade.resource === "alpha" ? 2 : upgrade.resource === "cash" ? cashLevel + 1 : 1,
      }))
    const rowByKey = new Map(data.rowByKey)
    const cashKey = `output.cash:${cashLevel + 1}`
    const alphaFirst = rowByKey.get("output.alpha:1")!
    const alphaSecond = rowByKey.get("output.alpha:2")!
    rowByKey.set("output.alpha:1", { ...alphaFirst, value: 30 })
    rowByKey.set("output.alpha:2", { ...alphaSecond, value: 20 })
    rowByKey.set(cashKey, { ...rowByKey.get(cashKey)!, value: 20 })
    rowByKey.set("output.beta:1", { ...rowByKey.get("output.beta:1")!, value: 10 })

    const { rows } = calculateTokenRecommendations(
      { ...baseInput, unlockedParticle: "beta", outputLevelsByResource: { cash: String(cashLevel) } },
      { upgrades, rowByKey },
    )

    if (cashLevel === 0) {
      expect(rows.map(({ id }) => id)).toEqual(["output.alpha", "output.cash", "output.alpha", "output.beta"])
    } else {
      expect(rows.map(({ id }) => id)).toEqual(["output.alpha", "output.cash", "output.beta"])
      expect(rows[0]).toMatchObject({ currentLevel: 0, nextLevel: 2, cost: alphaFirst.cost + alphaSecond.cost })
    }
  })

  it("groups consecutive Supplies Tokens levels without expanding Best Special", async () => {
    const data = await loadTokenData()
    const rowByKey = new Map(data.rowByKey)
    const suppliesLevelNine = rowByKey.get("supplies.tokenBonus:9")!
    const suppliesLevelTen = rowByKey.get("supplies.tokenBonus:10")!
    const alpha = rowByKey.get("output.alpha:1")!
    rowByKey.set("output.alpha:1", { ...alpha, value: (suppliesLevelNine.value + suppliesLevelTen.value) / 2 })
    const upgrades = data.upgrades
      .filter(({ id }) => id === "output.cash" || id === "output.alpha" || id === "supplies.tokenBonus")
      .map((upgrade) => (upgrade.group === "output" ? { ...upgrade, maxLevel: 1 } : upgrade))
    const result = calculateTokenRecommendations(
      { ...baseInput, levels: { "supplies.tokenBonus": "6" }, outputLevelsByResource: {}, tokensPerStep: "0" },
      { upgrades, rowByKey },
    )

    expect(result.rows[1]).toMatchObject({ id: "supplies.tokenBonus", currentLevel: 6, nextLevel: 9, cost: 390 })
    expect(result.bestSpecial).toMatchObject({ id: "supplies.tokenBonus", currentLevel: 6, nextLevel: 7, cost: 115 })
  })

  it("groups remaining Duration levels without expanding Best Special", async () => {
    const data = await loadTokenData()
    const rowByKey = new Map(data.rowByKey)
    const durationScores = [38, 39, 40].map((level) => rowByKey.get(`bbbot.duration:${level}`)!.value)
    const cash = rowByKey.get("output.cash:1")!
    const alpha = rowByKey.get("output.alpha:1")!
    rowByKey.set("output.cash:1", { ...cash, value: Math.max(...durationScores) + 1 })
    rowByKey.set("output.alpha:1", { ...alpha, value: Math.min(...durationScores) - 1 })
    const upgrades = data.upgrades
      .filter(
        ({ id }) =>
          id === "output.cash" || id === "output.alpha" || id === "bbbot.duration" || id === "bbbot.tokenBonus",
      )
      .map((upgrade) => (upgrade.group === "output" ? { ...upgrade, maxLevel: 1 } : upgrade))
    const result = calculateTokenRecommendations(
      {
        ...baseInput,
        enabled: {},
        unlockedParticle: "alpha",
        levels: { "bbbot.duration": "37" },
        outputLevelsByResource: {},
        tokensPerStep: "0",
      },
      { upgrades, rowByKey },
    )

    expect(result.rows[1]).toMatchObject({ id: "bbbot.duration", currentLevel: 37, nextLevel: 40, cost: 117 })
    expect(result.bestSpecial).toMatchObject({ id: "bbbot.duration", currentLevel: 37, nextLevel: 38, cost: 38 })
  })

  it("ranks the remaining Duration investment against Supplies Tokens using real costs", async () => {
    const data = await loadTokenData()
    const input: TokenInputState = {
      ...baseInput,
      tokensPerStep: "1000",
      enabled: { "supplies.crystalBonus": false },
    }
    const atLevel = (level: number, duration = 0) =>
      calculateTokenRecommendations(
        {
          ...input,
          levels: { "supplies.tokenBonus": String(level), "bbbot.duration": String(duration) },
        },
        data,
      )

    expect(atLevel(21).bestSpecial).toMatchObject({ id: "supplies.tokenBonus", nextLevel: 22, cost: 340 })
    expect(atLevel(22).bestSpecial).toMatchObject({ id: "bbbot.duration", nextLevel: 1, cost: 1 })
    expect(atLevel(22, 40).bestSpecial).toMatchObject({ id: "bbbot.tokenBonus", nextLevel: 1, cost: 10 })
    expect(atLevel(22, 39).bestSpecial).toMatchObject({ id: "bbbot.duration", nextLevel: 40, cost: 40 })
    expect(
      calculateTokenRecommendations(
        {
          ...input,
          levels: { "supplies.tokenBonus": "25", "bbbot.duration": "40", "bbbot.tokenBonus": "20" },
        },
        data,
      ).bestSpecial,
    ).toBeNull()
  })

  it("places the first Supplies Crystals level just after Alpha Output 50", async () => {
    const data = await loadTokenData()
    const enabled = Object.fromEntries(
      data.upgrades.map(({ id }) => [id, id === "output.alpha" || id === "supplies.crystalBonus"]),
    )
    const atAlphaLevel = (level: number) =>
      calculateTokenRecommendations(
        {
          ...baseInput,
          enabled,
          unlockedParticle: "alpha",
          outputLevelsByResource: { alpha: String(level) },
          tokensPerStep: "0",
        },
        data,
      )

    expect(atAlphaLevel(49).best).toMatchObject({ id: "output.alpha", nextLevel: 50 })
    expect(atAlphaLevel(50).best).toMatchObject({ id: "supplies.crystalBonus", nextLevel: 1 })
  })

  it("keeps the generated crystal score fixed across particle unlocks", async () => {
    const data = await loadTokenData()
    const input: TokenInputState = { ...baseInput, outputLevelsByResource: {}, tokensPerStep: "0", se: 100 }
    const early = calculateTokenRecommendations({ ...input, unlockedParticle: "alpha" }, data)
    const late = calculateTokenRecommendations({ ...input, unlockedParticle: "kappa" }, data)

    expect(early.bestSpecial).toMatchObject({ id: "supplies.crystalBonus", nextLevel: 1, cost: 200 })
    expect(late.bestSpecial).toMatchObject({ id: "supplies.crystalBonus", nextLevel: 1, cost: 200 })
    expect(late.bestSpecial?.score).toBe(early.bestSpecial?.score)
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

  it("reports section and upgrade spending including disabled purchases", () => {
    const input = {
      ...baseInput,
      levels: { ...baseInput.levels, "bbbot.duration": "12.8", "supplies.alpha": "2" },
      enabled: { ...baseInput.enabled, "bbbot.duration": false },
      outputLevelsByResource: { alpha: "2.7" },
    }
    const report = calculateTokenSpendingReport(input, testData)
    expect(report.sections.map((section) => section.spent)).toEqual([2, 20, 0, 100])
    expect(report.total).toBe(122)
    expect(report.total).toBe(calculateTotalTokensSpent(input, testData))
    expect(report.sections[3].rows[0]).toMatchObject({ id: "bbbot.duration", level: 10, spent: 100 })
    expect(report.sections.flatMap((section) => section.rows)).toHaveLength(testData.upgrades.length)
    expect(calculateTokenSpendingReport(input, null).total).toBe(0)
    expect(calculateTokenSpendingReport(input, null).sections.every((section) => section.rows.length === 0)).toBe(true)
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
