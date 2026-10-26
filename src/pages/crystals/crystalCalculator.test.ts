import { describe, expect, it } from "vitest"
import {
  applyCrystalActions,
  calculateCrystalRecommendations,
  calculateCrystalsSpent,
  calculateUpgradeCost,
} from "./crystalCalculator"
import { CRYSTAL_DATA } from "./crystalData"
import type { CrystalData, CrystalInputState, CrystalUpgrade } from "./crystalTypes"

const upgrade = (id: string, overrides: Partial<CrystalUpgrade> = {}): CrystalUpgrade => ({
  id,
  name: id,
  group: "output",
  baseCost: 10,
  costStep: 0,
  maxLevel: 100,
  requires: { upgrades: [] },
  ...overrides,
})

const state = (overrides: Partial<CrystalInputState> = {}): CrystalInputState => ({
  se: 1,
  playerLevel: 0,
  unlockedParticle: "alpha",
  levels: {},
  ...overrides,
})

describe("calculateUpgradeCost", () => {
  it("handles flat, stepped and unknown costs", () => {
    expect(calculateUpgradeCost(upgrade("a"), 0, 5)).toEqual({ cost: 50, unknown: false })
    // levels 2,3: (10+2*1) + (10+3*1)
    expect(calculateUpgradeCost(upgrade("a", { costStep: 1 }), 2, 4)).toEqual({ cost: 25, unknown: false })
    expect(calculateUpgradeCost(upgrade("a", { baseCost: null }), 0, 3)).toEqual({ cost: 0, unknown: true })
    expect(calculateUpgradeCost(upgrade("a"), 4, 4)).toEqual({ cost: 0, unknown: false })
  })

  it("sums crystals spent and flags unknown prices", () => {
    const data: CrystalData = { upgrades: [upgrade("a"), upgrade("b", { baseCost: null })], steps: [] }
    expect(calculateCrystalsSpent({ a: 3, b: 0 }, data)).toEqual({ cost: 30, unknown: false })
    expect(calculateCrystalsSpent({ a: 3, b: 1 }, data)).toEqual({ cost: 30, unknown: true })
  })
})

describe("calculateCrystalRecommendations", () => {
  const data: CrystalData = {
    upgrades: [
      upgrade("o.a", { maxLevel: 100 }),
      upgrade("o.b", { maxLevel: 100, requires: { particle: "beta", upgrades: [] } }),
      upgrade("c.a", {
        maxLevel: 10,
        requires: { upgrades: [{ id: "o.a", level: 5 }] },
      }),
      upgrade("late", { requires: { playerLevel: 50, upgrades: [] } }),
    ],
    steps: [
      {
        id: "s1",
        maxSe: 5,
        targets: [
          { id: "o.a", level: 100 },
          { id: "o.b", level: 100 },
        ],
      },
      { id: "s2", minSe: 6, targets: [{ id: "late", level: 10 }] },
      { id: "s3", targets: [{ id: "c.a", level: "max" }] },
    ],
  }

  it("chunks a target and skips locked upgrades", () => {
    const result = calculateCrystalRecommendations(state(), data, 1)
    expect(result.step?.id).toBe("s1")
    expect(result.actions[0]).toMatchObject({ id: "o.a", currentLevel: 0, targetLevel: 100 })
  })

  it("interleaves concurrent targets by lowest progress", () => {
    const result = calculateCrystalRecommendations(state({ unlockedParticle: "beta" }), data, 3)
    expect(result.actions.map((action) => action.id)).toEqual(["o.a", "o.b", "o.a"])
  })

  it("keeps the recommendation stable while buying single levels", () => {
    const first = calculateCrystalRecommendations(state({ unlockedParticle: "beta" }), data, 1).actions[0]
    for (const level of [1, 5, 9]) {
      const next = calculateCrystalRecommendations(
        state({ unlockedParticle: "beta", levels: { "o.a": level } }),
        data,
        1,
      ).actions[0]
      expect(next).toMatchObject({ id: first.id, targetLevel: first.targetLevel })
    }
  })

  it("ranks a prerequisite by the progress of the upgrade that needs it", () => {
    const pending: CrystalData = {
      upgrades: [
        upgrade("o.p", { maxLevel: 10 }),
        upgrade("c.p", { requires: { upgrades: [{ id: "o.p", level: 5 }] } }),
        upgrade("x"),
      ],
      steps: [
        {
          id: "s",
          targets: [
            { id: "c.p", level: 100 },
            { id: "x", level: 100 },
          ],
        },
      ],
    }
    const result = calculateCrystalRecommendations(state({ levels: { "o.p": 3 } }), pending, 1)
    expect(result.actions[0].id).toBe("o.p")
  })

  it("respects SE windows and skips locked steps", () => {
    const result = calculateCrystalRecommendations(state({ se: 10, levels: {} }), data, 1)
    expect(result.step?.id).toBe("s3")
  })

  it("buys prerequisites before the target", () => {
    const result = calculateCrystalRecommendations(state({ se: 10 }), data, 1)
    expect(result.actions[0]).toMatchObject({ id: "o.a", targetLevel: 5 })
    const done = calculateCrystalRecommendations(state({ se: 10, levels: { "o.a": 5 } }), data, 1)
    expect(done.actions[0].id).toBe("c.a")
  })

  it("completes a whole step", () => {
    const levels = applyCrystalActions(state({ unlockedParticle: "beta" }), data, "step")
    expect(levels).toEqual({ "o.a": 100, "o.b": 100 })
  })

  it("returns nothing when everything is done", () => {
    const result = calculateCrystalRecommendations(state({ se: 10, levels: { "o.a": 100, "c.a": 10 } }), data, 3)
    expect(result.actions).toEqual([])
    expect(result.step).toBeNull()
  })
})

describe("bundled guide data", () => {
  it("references only known upgrades", () => {
    const ids = new Set(CRYSTAL_DATA.upgrades.map((entry) => entry.id))
    for (const step of CRYSTAL_DATA.steps) {
      for (const target of step.targets) {
        expect(target.id === "erm" || ids.has(target.id), `${step.id}: ${target.id}`).toBe(true)
      }
    }
  })

  it("balances ERM once player level allows it", () => {
    const result = calculateCrystalRecommendations(
      state({ se: 12, playerLevel: 140, unlockedParticle: "kappa", levels: { "special.bulkExtractions": 10 } }),
      { ...CRYSTAL_DATA, steps: CRYSTAL_DATA.steps.filter((step) => step.id === "se10-erm") },
      1,
    )
    expect(result.step?.id).toBe("se10-erm")
    expect(result.actions[0].id).not.toBe("special.bulkExtractions")
  })
})
