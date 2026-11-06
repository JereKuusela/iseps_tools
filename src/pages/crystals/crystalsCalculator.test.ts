import { describe, expect, it } from "vitest"
import {
  calculateCrystalRecommendations,
  calculateCrystalsSpent,
  calculateUpgradeCost,
  isUpgradeUnlocked,
  levelsAfterBuying,
  levelsAfterCompletingFirst,
} from "./crystalsCalculator"
import { CRYSTAL_DATA, parseCrystalGuide, parseCrystalUpgrades } from "./crystalsData"
import type { CrystalAction, CrystalData, CrystalInputState, CrystalUpgrade } from "./crystalsTypes"

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

describe("parseCrystalGuide", () => {
  it("parses cumulative add entries with bounds", () => {
    const steps = parseCrystalGuide([
      { maxSe: 64, add: "output.alpha 50" },
      { maxPlayer: 180, add: ["erm", "bundle.alpha"] },
    ])
    expect(steps[0]).toMatchObject({ maxSe: 64, add: [{ id: "output.alpha", level: 50 }] })
    expect(steps[1].add).toEqual([
      { id: "erm", level: "max" },
      { id: "bundle.alpha", level: "max" },
    ])
    expect(steps[1].maxPlayer).toBe(180)
  })

  it("accepts a single string for add", () => {
    const [step] = parseCrystalGuide([
      {
        se: 6,
        player: 90,
        maxPlayer: 100,
        add: "output.alpha 100",
      },
    ])
    expect(step).toMatchObject({ minSe: 6, player: 90, maxPlayer: 100 })
    expect(step.add).toEqual([{ id: "output.alpha", level: 100 }])
  })

  it.each(["player", "minPlayer"])("starts saving at the %s threshold, before the upgrade unlocks", (field) => {
    const data: CrystalData = {
      upgrades: [upgrade("a"), upgrade("locked", { requires: { playerLevel: 100, upgrades: [] } })],
      steps: parseCrystalGuide([{ add: "a 1" }, { se: 6, [field]: 90, add: "locked 1", doneNote: "Finished." }]),
    }
    expect(calculateCrystalRecommendations(state({ se: 5, playerLevel: 90 }), data, 1).savingFor.names).toEqual([])
    const before = calculateCrystalRecommendations(state({ se: 6, playerLevel: 89 }), data, 1)
    expect(before.savingFor.names).toEqual([])
    expect(before.doneNotes).toEqual([])
    const saving = calculateCrystalRecommendations(state({ se: 6, playerLevel: 90, levels: { a: 1 } }), data, 1)
    expect(saving.savingFor).toEqual({ names: ["locked"], cost: { cost: 10, unknown: false } })
    expect(saving.doneNotes).toEqual([])
    expect(
      calculateCrystalRecommendations(state({ se: 6, playerLevel: 100, levels: { a: 1 } }), data, 1).actions[0].id,
    ).toBe("locked")
  })

  it("generates internal ids for unlabeled steps and preserves purchase boundaries", () => {
    const steps = parseCrystalGuide([{ add: ["a 10"] }, { add: ["a 20"] }])
    expect(steps.map((step) => step.id)).toEqual(["step-0", "step-1"])
    const result = calculateCrystalRecommendations(state(), { upgrades: [upgrade("a")], steps }, 2)
    expect(result.actions.map((action) => [action.currentLevel, action.targetLevel])).toEqual([
      [0, 10],
      [10, 20],
    ])
  })

  it("parses explicit levels and defaults bare ids to max", () => {
    const [step] = parseCrystalGuide([
      {
        id: "compact",
        add: ["output.alpha 50", "bundle.alpha", "  output.all 0  "],
      },
    ])
    expect(step.add).toEqual([
      { id: "output.alpha", level: 50 },
      { id: "bundle.alpha", level: "max" },
      { id: "output.all", level: 0 },
    ])
  })

  it("skips malformed string targets", () => {
    const [step] = parseCrystalGuide([
      {
        id: "invalid",
        add: [
          "",
          "50",
          "output.alpha -1",
          "output.alpha 1.5",
          "output.alpha max",
          "output.alpha 50 extra",
          "output.alpha 99999999999999999999",
          "50 output.alpha",
        ],
      },
    ])
    expect(step.add).toEqual([])
  })
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
  it("expires bounded entries without affecting other entries", () => {
    const bucketed: CrystalData = {
      upgrades: [
        upgrade("a"),
        upgrade("b"),
        upgrade("c"),
        upgrade("old"),
        upgrade("locked", { requires: { playerLevel: 100, upgrades: [] } }),
      ],
      steps: parseCrystalGuide([
        { add: "a 1" },
        { maxSe: 64, add: ["old 1", "locked 1"], doneNote: "Old note." },
        { se: 65, add: "b 2" },
        { add: "c 3" },
      ]),
    }
    const result = calculateCrystalRecommendations(state({ se: 65 }), bucketed, 3)
    expect(result.actions.map((action) => [action.id, action.targetLevel])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ])
    expect(result.savingFor.names).toEqual([])
    expect(result.doneNotes).toEqual([])
    expect(calculateCrystalRecommendations(state({ se: 65, levels: { a: 1 } }), bucketed, 1).stepIndex).toBe(2)
  })

  it("uses bounded tiers and preserves file order during lookahead", () => {
    const bucketed: CrystalData = {
      upgrades: [upgrade("old"), upgrade("a"), upgrade("b")],
      steps: parseCrystalGuide([
        { maxSe: 54, add: "old 1" },
        { se: 55, maxSe: 64, add: "a 1" },
        { se: 65, add: "b 1" },
      ]),
    }
    expect(calculateCrystalRecommendations(state({ se: 65 }), bucketed, 3).actions.map((action) => action.id)).toEqual([
      "b",
    ])
    expect(calculateCrystalRecommendations(state({ se: 55 }), bucketed, 3).actions.map((action) => action.id)).toEqual([
      "a",
      "b",
    ])
  })

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
        add: [
          { id: "o.a", level: 100 },
          { id: "o.b", level: 100 },
        ],
      },
      { id: "s2", minSe: 6, add: [{ id: "late", level: 10 }] },
      { id: "s3", add: [{ id: "c.a", level: "max" }] },
    ],
  }

  it("chunks a target and skips locked upgrades", () => {
    const result = calculateCrystalRecommendations(state(), data, 1)
    expect(result.step?.id).toBe("s1")
    expect(result.actions[0]).toMatchObject({ id: "o.a", currentLevel: 0, targetLevel: 100 })
  })

  it("completes targets in listed order", () => {
    const result = calculateCrystalRecommendations(state({ unlockedParticle: "beta" }), data, 3)
    expect(result.actions.map((action) => [action.id, action.targetLevel])).toEqual([
      ["o.a", 100],
      ["o.b", 100],
      ["c.a", 10],
    ])
  })

  it("prioritizes an earlier file entry when its threshold is met", () => {
    const priority: CrystalData = {
      upgrades: [upgrade("a"), upgrade("gp"), upgrade("gcorp")],
      steps: parseCrystalGuide([
        { id: "minimum", se: 4, maxSe: 49, add: "gp 4" },
        { id: "base", add: ["a 10"] },
        {
          id: "se4",
          minSe: 4,
          maxSe: 49,
          add: ["gp 5", "gcorp 1"],
        },
      ]),
    }
    expect(calculateCrystalRecommendations(state({ se: 3 }), priority, 4).actions.map((action) => action.id)).toEqual([
      "a",
      "gp",
      "gp",
      "gcorp",
    ])

    const result = calculateCrystalRecommendations(state({ se: 4 }), priority, 4)
    expect(result.step).toBe(priority.steps[0])
    expect(result.stepIndex).toBe(0)
    expect(result.actions.map((action) => [action.id, action.targetLevel])).toEqual([
      ["gp", 4],
      ["a", 10],
      ["gp", 5],
      ["gcorp", 1],
    ])
    expect(calculateCrystalRecommendations(state({ se: 50 }), priority, 4).actions.map((action) => action.id)).toEqual([
      "a",
    ])
  })

  it("preserves entry and target order", () => {
    const priority: CrystalData = {
      upgrades: [upgrade("a"), upgrade("b"), upgrade("c"), upgrade("d")],
      steps: [
        {
          id: "first",
          add: [
            { id: "a", level: 1 },
            { id: "d", level: 1 },
          ],
        },
        {
          id: "second",
          add: [
            { id: "b", level: 1 },
            { id: "c", level: 1 },
          ],
        },
      ],
    }
    expect(calculateCrystalRecommendations(state(), priority, 4).actions.map((action) => action.id)).toEqual([
      "a",
      "d",
      "b",
      "c",
    ])
  })

  it("expires optional SE targets while retaining the priority minimum", () => {
    const bounded: CrystalData = {
      upgrades: [upgrade("a"), upgrade("gp"), upgrade("gcorp", { maxLevel: 1 })],
      steps: parseCrystalGuide([
        { se: 4, add: "gp 4" },
        { id: "base", add: ["a 10"] },
        { se: 4, maxSe: 5, add: ["gp 5", "gcorp"] },
      ]),
    }
    const planned = (se: number) =>
      calculateCrystalRecommendations(state({ se }), bounded, 4).actions.map((action) => [
        action.id,
        action.targetLevel,
      ])
    expect(planned(5)).toEqual([
      ["gp", 4],
      ["a", 10],
      ["gp", 5],
      ["gcorp", 1],
    ])
    expect(planned(6)).toEqual([
      ["gp", 4],
      ["a", 10],
    ])
    expect(planned(10)).toEqual(planned(6))

    const levels = Object.freeze({ gp: 5, gcorp: 1 })
    expect(calculateCrystalRecommendations(state({ se: 6, levels }), bounded, 4).actions[0].id).toBe("a")
    expect(levels).toEqual({ gp: 5, gcorp: 1 })
  })

  it("uses inclusive player bounds and allows later targets for the same upgrade", () => {
    const bounded: CrystalData = {
      upgrades: [upgrade("gp")],
      steps: parseCrystalGuide([
        { player: 80, maxPlayer: 90, add: ["gp 4", "gp 5"] },
        { player: 91, add: "gp 6" },
      ]),
    }
    for (const playerLevel of [79, 80, 90]) {
      expect(
        calculateCrystalRecommendations(state({ playerLevel }), bounded, 2).actions.map((action) => action.targetLevel),
      ).toEqual([5, 6])
    }
    expect(
      calculateCrystalRecommendations(state({ playerLevel: 91 }), bounded, 2).actions.map(
        (action) => action.targetLevel,
      ),
    ).toEqual([6])
  })

  it("excludes expired player targets from saving goals and completion notes", () => {
    const bounded: CrystalData = {
      upgrades: [upgrade("gp"), upgrade("locked", { requires: { playerLevel: 50, upgrades: [] } })],
      steps: parseCrystalGuide([{ maxPlayer: 40, doneNote: "Finished.", add: ["gp 4", "locked 1"] }]),
    }
    const active = calculateCrystalRecommendations(state({ playerLevel: 40 }), bounded, 1)
    expect(active.actions[0].id).toBe("gp")
    expect(active.savingFor.names).toEqual([])
    const saving = calculateCrystalRecommendations(state({ playerLevel: 40, levels: { gp: 4 } }), bounded, 1)
    expect(saving.savingFor.names).toEqual(["locked"])
    const expired = calculateCrystalRecommendations(state({ playerLevel: 41 }), bounded, 1)
    expect(expired.actions).toEqual([])
    expect(expired.savingFor.names).toEqual([])
    expect(expired.doneNotes).toEqual([])
    const owned = calculateCrystalRecommendations(state({ playerLevel: 50, levels: { gp: 4, locked: 1 } }), bounded, 1)
    expect(owned.doneNotes).toEqual([])
  })

  it("keeps consecutive purchases of the same upgrade separate across steps", () => {
    const consecutive: CrystalData = {
      upgrades: [upgrade("a")],
      steps: [
        { id: "first", add: [{ id: "a", level: 10 }] },
        { id: "second", add: [{ id: "a", level: 20 }] },
      ],
    }
    const result = calculateCrystalRecommendations(state(), consecutive, 2)
    expect(result.actions.map((action) => [action.stepId, action.currentLevel, action.targetLevel])).toEqual([
      ["first", 0, 10],
      ["second", 10, 20],
    ])
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
          add: [
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
      steps: [{ id: "nested", add: [{ id: "root", level: 1 }] }],
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
      steps: [{ id: "chain", add: [{ id: "0", level: 1 }] }],
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

  it("looks ahead to future entries after completing current targets, including in the preview", () => {
    const future: CrystalData = {
      upgrades: [upgrade("a"), upgrade("b"), upgrade("c")],
      steps: parseCrystalGuide([
        { add: "a 1" },
        { se: 10, add: "b 2", doneNote: "Future complete." },
        { player: 90, add: "c 3" },
      ]),
    }
    const preview = calculateCrystalRecommendations(state(), future, 3)
    expect(preview.actions.map((action) => [action.id, action.targetLevel])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ])
    const next = calculateCrystalRecommendations(state({ levels: { a: 1 } }), future, 2)
    expect(next.step).toBe(future.steps[1])
    expect(next.stepIndex).toBe(1)
    expect(next.actions[0].id).toBe("b")
    expect(next.doneNotes).toEqual([])
    expect(calculateCrystalRecommendations(state({ levels: { a: 1, b: 2, c: 3 } }), future, 1).actions).toEqual([])
  })

  it("looks ahead past blocked entries without bypassing actual upgrade requirements", () => {
    const future: CrystalData = {
      upgrades: [upgrade("locked", { requires: { playerLevel: 100, upgrades: [] } }), upgrade("a"), upgrade("b")],
      steps: parseCrystalGuide([{ add: "locked 1" }, { se: 10, add: "locked 2" }, { player: 90, add: ["a 1", "b 2"] }]),
    }
    const result = calculateCrystalRecommendations(state(), future, 2)
    expect(result.actions.map((action) => [action.id, action.targetLevel])).toEqual([
      ["a", 1],
      ["b", 2],
    ])
    expect(result.savingFor).toEqual({ names: ["locked"], cost: { cost: 10, unknown: false } })
  })

  it("does not revive expired entries or let future entries preempt current purchases", () => {
    const future: CrystalData = {
      upgrades: [upgrade("a"), upgrade("b"), upgrade("expired")],
      steps: parseCrystalGuide([
        { se: 20, maxSe: 5, add: "expired 1" },
        { player: 100, maxPlayer: 10, add: "expired 1" },
        { add: "a 1" },
        { se: 20, add: "b 1" },
      ]),
    }
    const result = calculateCrystalRecommendations(state({ se: 6, playerLevel: 11 }), future, 3)
    expect(result.actions.map((action) => action.id)).toEqual(["a", "b"])
  })

  it("shows a saving goal when every future entry is blocked", () => {
    const future: CrystalData = {
      upgrades: [upgrade("locked", { requires: { particle: "beta", upgrades: [] } })],
      steps: parseCrystalGuide([{ se: 10, add: "locked 2" }]),
    }
    const result = calculateCrystalRecommendations(state(), future, 1)
    expect(result.actions).toEqual([])
    expect(result.savingFor).toEqual({ names: ["locked"], cost: { cost: 20, unknown: false } })
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
      { id: "s1", doneNote: "Convert crystals to tokens.", add: [{ id: "a", level: 10 }] },
      { id: "s2", add: [{ id: "late", level: 10 }] },
      { id: "s3", add: [{ id: "later", level: 5 }] },
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
  const ERM_IDS = ["special.bulkExtractions", "special.bulkResearches", "special.bulkDcMilestones"]

  it.each([
    {
      se: 55,
      rows: [
        [5, 0, 0, 0, 0, 0, 0],
        [50, 8, 10, 0, 0, 1, 0],
        [100, 16, 40, 5, 5, 1, 1],
        [125, 20, 50, 45, 5, 1, 1],
      ],
    },
    {
      se: 65,
      rows: [
        [0, 3, 0, 0, 0, 0, 0],
        [50, 12, 5, 0, 0, 1, 0],
        [100, 20, 35, 0, 5, 1, 1],
        [140, 27, 50, 50, 5, 1, 1],
      ],
    },
    {
      se: 75,
      rows: [
        [0, 3, 0, 0, 0, 0, 0],
        [50, 12, 0, 0, 0, 1, 0],
        [100, 21, 5, 0, 0, 1, 1],
        [130, 26, 20, 0, 5, 1, 1],
        [200, 33, 50, 10, 5, 1, 1],
        [250, 40, 50, 50, 5, 1, 1],
        [300, 45, 50, 100, 5, 1, 1],
      ],
    },
    {
      se: 85,
      rows: [
        [50, 9, 0, 0, 0, 1, 0],
        [100, 17, 0, 0, 0, 1, 1],
        [200, 29, 20, 0, 5, 1, 1],
        [275, 36, 45, 10, 5, 1, 1],
        [350, 43, 50, 55, 5, 1, 1],
        [400, 47, 50, 90, 5, 1, 1],
        [425, 50, 50, 100, 5, 1, 1],
      ],
    },
    {
      se: 95,
      rows: [
        [100, 14, 0, 0, 0, 1, 1],
        [200, 25, 10, 0, 0, 1, 1],
        [250, 30, 20, 0, 5, 1, 1],
        [350, 39, 45, 5, 5, 1, 1],
        [450, 45, 50, 55, 5, 1, 1],
        [525, 50, 50, 90, 5, 1, 1],
      ],
    },
  ])("matches SE$se table milestones after merging adjacent upgrade targets", ({ se, rows }) => {
    const columns = [
      "output.juno",
      "special.bulkEmblemMilestones",
      "erm",
      "special.infinityAmp",
      "special.infinityMaxLv",
      "bundle.juno",
      "bundle.ixionJuno",
    ]
    const expected: { id: string; level: number | "max" }[] = []
    let previous = columns.map(() => 0)
    for (const row of rows) {
      row.forEach((level, index) => {
        if (level <= previous[index]) return
        if (columns[index] !== "erm") {
          expected.push({ id: columns[index], level: index >= 5 ? "max" : level })
          return
        }
        // ERM is written out as round-robin targets in steps of 5 levels.
        for (let step = previous[index] + 5; step <= level; step += 5) {
          for (const id of ERM_IDS) expected.push({ id, level: step })
        }
      })
      previous = row
    }
    const normalize = (target: { id: string; level: number | "max" }) => ({
      ...target,
      level:
        target.level === "max"
          ? CRYSTAL_DATA.upgrades.find((upgrade) => upgrade.id === target.id)!.maxLevel
          : target.level,
    })
    const step = CRYSTAL_DATA.steps.find((entry) => entry.minSe === se - 5)
    expect(step?.add.map(normalize)).toEqual(
      expected.filter((target, index) => expected[index + 1]?.id !== target.id).map(normalize),
    )
  })

  it("uses the bounded SE tier for SE 50-89", () => {
    const bucketed = {
      ...CRYSTAL_DATA,
      steps: CRYSTAL_DATA.steps.filter((step) => step.maxSe !== undefined && (step.minSe ?? 0) >= 50),
    }
    const input = state({ se: 55, playerLevel: 500, unlockedParticle: "kappa" })
    expect(calculateCrystalRecommendations(input, bucketed, 1).actions[0]).toMatchObject({
      id: "output.juno",
      targetLevel: 50,
    })
    expect(calculateCrystalRecommendations({ ...input, se: 65 }, bucketed, 1).actions[0]).toMatchObject({
      id: "special.bulkEmblemMilestones",
      targetLevel: 3,
    })
  })

  it("finishes All Output 10, then Alpha 100, then All Output 20", () => {
    const input = state({
      levels: {
        "output.alpha": 90,
        "output.energyPrice": 10,
        "output.all": 9,
        "bundle.alpha": 1,
        "bundle.egetarium": 1,
        "bundle.cot": 1,
      },
    })
    const ordered: CrystalData = {
      ...CRYSTAL_DATA,
      steps: [
        {
          id: "ordered",
          add: [
            { id: "output.all", level: 10 },
            { id: "output.alpha", level: 100 },
            { id: "output.all", level: 20 },
          ],
        },
      ],
    }
    const result = calculateCrystalRecommendations(input, ordered, 3)
    expect(result.actions.map((action) => [action.id, action.currentLevel, action.targetLevel])).toEqual([
      ["output.all", 9, 10],
      ["output.alpha", 90, 100],
      ["output.all", 10, 20],
    ])

    const completed = state({ levels: { ...input.levels, ...levelsAfterCompletingFirst(result.actions) } })
    expect(completed.levels["output.all"]).toBe(10)
    expect(calculateCrystalRecommendations(completed, ordered, 1).actions[0]).toMatchObject({
      id: "output.alpha",
      currentLevel: 90,
      targetLevel: 100,
    })
  })

  it.each([
    { alpha: 50, other: 49, target: 51 },
    { alpha: 30, other: 70, target: 50 },
    { alpha: 0, other: 0, target: 100 },
  ])("buys Alpha from $alpha to $target with $other other Output levels", ({ alpha, other, target }) => {
    const input = state({ levels: { "output.alpha": alpha, "output.energyPrice": other } })
    const result = calculateCrystalRecommendations(input, CRYSTAL_DATA, 2)

    expect(result.step?.totalOutputLevels).toBe(100)
    expect(result.actions[0]).toMatchObject({
      id: "output.alpha",
      currentLevel: alpha,
      targetLevel: target,
      cost: { cost: (target - alpha) * 20, unknown: false },
    })
    expect(result.actions[1].id).toBe("bundle.alpha")

    const completed = state({ levels: { ...input.levels, ...levelsAfterCompletingFirst(result.actions) } })
    expect(calculateCrystalRecommendations(completed, CRYSTAL_DATA, 1).actions[0].id).toBe("bundle.alpha")
  })

  it("moves on to bundles at Alpha 50 when total Output is already 100", () => {
    const result = calculateCrystalRecommendations(
      state({ levels: { "output.alpha": 50, "output.energyPrice": 30, "output.all": 20 } }),
      CRYSTAL_DATA,
      1,
    )
    expect(result.step?.totalOutputLevels).toBe(100)
    expect(result.actions[0].id).toBe("bundle.alpha")
  })

  it("does not count non-Output upgrades toward the total", () => {
    const result = calculateCrystalRecommendations(
      state({ levels: { "output.alpha": 50, "cost.alpha": 50, "special.bulkArtifacts": 50 } }),
      CRYSTAL_DATA,
      1,
    )
    expect(result.step?.totalOutputLevels).toBe(100)
    expect(result.actions[0]).toMatchObject({ id: "output.alpha", targetLevel: 100 })
  })

  it("recommends Alpha Output to 100 before moving on to bundles", () => {
    const pending = calculateCrystalRecommendations(state({ levels: { "output.alpha": 50 } }), CRYSTAL_DATA, 1)
    expect(pending.step?.totalOutputLevels).toBe(100)
    expect(pending.actions[0]).toMatchObject({ id: "output.alpha", currentLevel: 50, targetLevel: 100 })

    const unlocked = calculateCrystalRecommendations(state({ levels: { "output.alpha": 100 } }), CRYSTAL_DATA, 1)
    expect(unlocked.step?.totalOutputLevels).toBe(100)
    expect(unlocked.actions[0].id).toBe("bundle.alpha")
  })

  it("references only known upgrades", () => {
    const ids = new Set(CRYSTAL_DATA.upgrades.map((entry) => entry.id))
    for (const step of CRYSTAL_DATA.steps) {
      for (const target of step.add) {
        expect(ids.has(target.id), `${step.id}: ${target.id}`).toBe(true)
      }
    }
  })

  it("balances ERM once player level allows it", () => {
    const result = calculateCrystalRecommendations(
      state({
        se: 12,
        playerLevel: 140,
        unlockedParticle: "kappa",
        levels: { "bundle.tiberius": 1, "special.bulkExtractions": 10 },
      }),
      { ...CRYSTAL_DATA, steps: CRYSTAL_DATA.steps.filter((step) => step.player === 90) },
      1,
    )
    expect(result.step?.player).toBe(90)
    expect(result.actions[0].id).not.toBe("special.bulkExtractions")
  })
})
