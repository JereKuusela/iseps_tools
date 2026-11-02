import { describe, expect, it } from "vitest"
import {
  calculateCrystalRecommendations,
  calculateCrystalsSpent,
  calculateUpgradeCost,
  isUpgradeUnlocked,
  levelsAfterBuying,
  levelsAfterCompletingFirst,
} from "./crystalCalculator"
import { CRYSTAL_DATA, parseCrystalUpgrades } from "./crystalData"
import type { CrystalAction, CrystalData, CrystalInputState, CrystalUpgrade } from "./crystalTypes"

const upgrade = (id: string, overrides: Partial<CrystalUpgrade> = {}): CrystalUpgrade =>
  parseCrystalUpgrades([
    {
      id,
      name: id,
      group: "output",
      baseCost: 10,
      costStep: 0,
      maxLevel: 100,
      requires: { upgrades: [] },
      ...overrides,
    },
  ])[0]

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

describe("cached full requirements", () => {
  it("builds flat requirements at load time and checks live state without rediscovery", () => {
    const upgrades = parseCrystalUpgrades([
      upgrade("root", { requires: { upgrades: [{ id: "middle", level: 1 }] } }),
      upgrade("middle", { requires: { upgrades: [{ id: "leaf", level: 1 }] } }),
      upgrade("leaf", { requires: { particle: "beta", se: 5, playerLevel: 50, upgrades: [] } }),
      upgrade("other", { requires: { upgrades: [{ id: "middle", level: 1 }] } }),
    ])
    const [root, middle, leaf, other] = upgrades
    expect(root.fullRequires).toEqual([leaf.requires, middle.requires, root.requires])
    expect(other.fullRequires).toEqual([leaf.requires, middle.requires, other.requires])
    expect(leaf.fullRequires).toEqual([leaf.requires])

    const unlocked = state({ se: 5, playerLevel: 50, unlockedParticle: "beta" })
    expect(isUpgradeUnlocked(root, state())).toBe(false)
    expect(isUpgradeUnlocked(root, unlocked)).toBe(true)
    expect(isUpgradeUnlocked(root, { ...unlocked, se: 4 })).toBe(false)
    expect(isUpgradeUnlocked(root, { ...unlocked, playerLevel: 49 })).toBe(false)
    expect(isUpgradeUnlocked(root, { ...unlocked, unlockedParticle: "alpha" })).toBe(false)
    expect(isUpgradeUnlocked(root, state({ levels: { middle: 1 } }))).toBe(false)
  })

  it("includes shared prerequisites only once", () => {
    const upgrades = parseCrystalUpgrades([
      upgrade("root", {
        requires: {
          upgrades: [
            { id: "a", level: 1 },
            { id: "b", level: 1 },
          ],
        },
      }),
      upgrade("a", { requires: { upgrades: [{ id: "leaf", level: 1 }] } }),
      upgrade("b", { requires: { upgrades: [{ id: "leaf", level: 1 }] } }),
      upgrade("leaf"),
    ])
    expect(upgrades[0].fullRequires).toEqual([
      upgrades[3].requires,
      upgrades[1].requires,
      upgrades[2].requires,
      upgrades[0].requires,
    ])
  })

  it("returns ready-to-check upgrades without prerequisites", () => {
    const parsed = upgrade("parsed")
    expect(parsed.fullRequires).toEqual([parsed.requires])
    expect(isUpgradeUnlocked(parsed, state())).toBe(true)
  })
})

describe("calculateCrystalRecommendations", () => {
  const data: CrystalData = {
    upgrades: parseCrystalUpgrades([
      upgrade("o.a", { maxLevel: 100 }),
      upgrade("o.b", { maxLevel: 100, requires: { particle: "beta", upgrades: [] } }),
      upgrade("c.a", {
        maxLevel: 10,
        requires: { upgrades: [{ id: "o.a", level: 5 }] },
      }),
      upgrade("late", { requires: { playerLevel: 50, upgrades: [] } }),
    ]),
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
      upgrades: parseCrystalUpgrades([
        upgrade("o.p", { maxLevel: 10 }),
        upgrade("c.p", { requires: { upgrades: [{ id: "o.p", level: 5 }] } }),
        upgrade("x"),
      ]),
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

  it("checks the full prerequisite chain even when an intermediate upgrade is owned", () => {
    const nested: CrystalData = {
      upgrades: parseCrystalUpgrades([
        upgrade("root", { requires: { upgrades: [{ id: "middle", level: 1 }] } }),
        upgrade("middle", { requires: { upgrades: [{ id: "leaf", level: 1 }] } }),
        upgrade("leaf", { requires: { playerLevel: 50, upgrades: [] } }),
      ]),
      steps: [{ id: "nested", targets: [{ id: "root", level: 1 }] }],
    }

    expect(calculateCrystalRecommendations(state(), nested, 3).actions).toEqual([])
    expect(
      calculateCrystalRecommendations(state({ playerLevel: 50 }), nested, 3).actions.map((action) => action.id),
    ).toEqual(["leaf", "middle", "root"])
    expect(calculateCrystalRecommendations(state({ levels: { middle: 1 } }), nested, 1).actions).toEqual([])
  })

  it("resolves prerequisite chains beyond the former depth limit", () => {
    const chain: CrystalData = {
      upgrades: parseCrystalUpgrades(
        Array.from({ length: 8 }, (_, index) =>
          upgrade(String(index), {
            maxLevel: 1,
            requires: { upgrades: index < 7 ? [{ id: String(index + 1), level: 1 }] : [] },
          }),
        ),
      ),
      steps: [{ id: "chain", targets: [{ id: "0", level: 1 }] }],
    }
    expect(calculateCrystalRecommendations(state(), chain, 8).actions.map((action) => action.id)).toEqual([
      "7",
      "6",
      "5",
      "4",
      "3",
      "2",
      "1",
      "0",
    ])
  })

  it("keeps input levels unchanged and returns the original guide step", () => {
    const levels = Object.freeze({ "o.a": 5 })
    const result = calculateCrystalRecommendations(state({ levels, unlockedParticle: "beta" }), data, 3)

    expect(levels).toEqual({ "o.a": 5 })
    expect(result.actions).toHaveLength(3)
    expect(result.actions[0].currentLevel).toBe(5)
    expect(result.step).toBe(data.steps[0])
  })

  it("returns nothing when everything is done", () => {
    const result = calculateCrystalRecommendations(state({ se: 10, levels: { "o.a": 100, "c.a": 10 } }), data, 3)
    expect(result.actions).toEqual([])
    expect(result.step).toBeNull()
  })
})

describe("applying listed actions", () => {
  const action = (id: string, currentLevel: number, targetLevel: number, stepId: string): CrystalAction => ({
    id,
    name: id,
    currentLevel,
    targetLevel,
    maxLevel: 100,
    cost: { cost: 0, unknown: false },
    stepId,
  })

  it("adds the count to the first listed upgrade only", () => {
    const actions = [action("a", 20, 23, "s1"), action("b", 20, 23, "s1")]
    expect(levelsAfterBuying(actions, 100)).toEqual({ a: 120 })
    expect(levelsAfterBuying(actions, 1)).toEqual({ a: 21 })
    expect(levelsAfterBuying([], 5)).toEqual({})
  })

  it("completes only the first listed row when upgrades alternate", () => {
    const actions = [action("a", 20, 23, "s1"), action("b", 20, 23, "s1"), action("a", 23, 26, "s1")]
    expect(levelsAfterCompletingFirst(actions)).toEqual({ a: 23 })
    expect(levelsAfterCompletingFirst([])).toEqual({})
  })
})

describe("notes", () => {
  const data: CrystalData = {
    upgrades: parseCrystalUpgrades([
      upgrade("a", { maxLevel: 10 }),
      upgrade("late", { maxLevel: 10, requires: { playerLevel: 50, upgrades: [] } }),
      upgrade("later", { maxLevel: 5, baseCost: null, requires: { playerLevel: 80, upgrades: [] } }),
    ]),
    steps: [
      { id: "s1", doneNote: "Convert crystals to tokens.", targets: [{ id: "a", level: 10 }] },
      { id: "s2", targets: [{ id: "late", level: 10 }] },
      { id: "s3", targets: [{ id: "later", level: 5 }] },
    ],
  }

  it("shows a done note only once the step is complete", () => {
    expect(calculateCrystalRecommendations(state(), data, 1).doneNotes).toEqual([])
    expect(calculateCrystalRecommendations(state({ levels: { a: 10 } }), data, 1).doneNotes).toEqual([
      "Convert crystals to tokens.",
    ])
  })

  it("lists locked upgrades up to the next fully blocked step", () => {
    const { savingFor } = calculateCrystalRecommendations(state({ levels: { a: 10 } }), data, 1)
    expect(savingFor.names).toEqual(["late"])
    expect(savingFor.cost).toEqual({ cost: 100, unknown: false })
  })

  it("flags unknown costs and includes everything when no step is actionable", () => {
    const { savingFor } = calculateCrystalRecommendations(state({ levels: { a: 10 } }), data, 1)
    expect(savingFor.cost.unknown).toBe(false)
    const all = calculateCrystalRecommendations(state({ playerLevel: 10, levels: { a: 10 } }), data, 1)
    expect(all.savingFor.names).toEqual(["late"])
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
