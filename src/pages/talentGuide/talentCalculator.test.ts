import { describe, expect, it } from "vitest"
import { perkDataBundle } from "../../shared/perkContext"
import { computeTalentAllocation, getRow5Weights } from "./talentCalculator"

const perksAt = (se: number) =>
  new Set(perkDataBundle.perks.find((entry) => entry.run === "se" && entry.se === se)?.perks ?? [])

const run = (se: number, lp: number, gCorpMaxed = false) =>
  computeTalentAllocation({ se, lp, gCorpMaxed, perks: perksAt(se) })

describe("computeTalentAllocation", () => {
  it("adds PP3-1 extras by SE", () => {
    expect(run(128, 500).levels["PP3-1"]).toBe(2)
    expect(run(150, 500).levels["PP3-1"]).toBe(5)
  })
  it("adds respec warnings and LP based notes", () => {
    expect(run(50, 22).notes.some((note) => note.startsWith("Respec needed"))).toBe(false)
    expect(run(50, 23).notes[0]).toContain("PP1-1 5 → 0")
    expect(run(50, 31).notes[0]).toContain("Respec needed")
    expect(run(50, 0).notes[0]).toContain("player level 50")
    expect(run(50, 400).notes.some((note) => note.includes("Row 6 costs 10 LP"))).toBe(true)
    expect(run(14, 100).notes).toEqual([])
  })

  it("follows the fixed path up to 47 LP", () => {
    expect(run(50, 5).levels).toEqual({ "IC1-1": 5 })
    expect(run(50, 23).levels["PP2-3"]).toBe(1)
    expect(run(50, 47).unallocated).toBe(0)
  })

  it("spends every LP between 48 and 650", () => {
    for (const lp of [48, 60, 100, 200, 349, 350, 600, 650]) {
      expect(run(128, lp).unallocated).toBe(0)
    }
  })

  it("keeps remainders below 10 unallocated while saving for row 6", () => {
    const result = run(128, 357)
    expect(result.unallocated).toBe(7)
    expect(result.levels["IC6-1"]).toBe(0)
    expect(run(128, 360).levels["IC6-1"]).toBe(1)
  })

  it("fills row 6 in the fixed order and caps at 5 levels", () => {
    const result = run(128, 400)
    expect(result.levels["IC6-1"]).toBe(5)
    expect(result.levels["PP6-1"]).toBe(0)
    expect(run(128, 450).levels["PP6-1"]).toBe(5)
    const full = run(128, 650)
    for (const id of ["IC6-1", "PP6-1", "IC6-3", "PP6-3", "IC6-2", "PP6-2"]) expect(full.levels[id]).toBe(5)
  })

  it("returns to row 5 after row 6 is maxed", () => {
    const at650 = run(128, 650)
    const at700 = run(128, 700)
    const row5 = (levels: Record<string, number>) =>
      ["PP5-1", "PP5-2", "PP5-3", "IC5-1", "IC5-2", "IC5-3"].reduce((s, id) => s + (levels[id] ?? 0), 0)
    expect(row5(at700.levels) - row5(at650.levels)).toBe(50)
  })

  it("fills the SE128 extras before the weighted row 5 split at 100 LP", () => {
    const { levels, spentPP, spentIC } = run(128, 100)
    expect(levels["PP1-1"]).toBe(5)
    expect(levels["PP3-1"]).toBe(2)
    expect(spentPP + spentIC).toBe(100)
    expect(levels["IC5-2"]).toBeGreaterThan(levels["PP5-2"])
  })

  it("drops extra PP1-1 and PP2-1 levels and shrinks PP5-2 when G-Corp is maxed", () => {
    const off = run(128, 200)
    const on = run(128, 200, true)
    expect(on.levels["PP1-1"] ?? 0).toBe(0)
    expect(on.levels["PP2-1"] ?? 0).toBe(0)
    expect(on.levels["PP5-2"]).toBeLessThan(off.levels["PP5-2"])
    expect(on.unallocated).toBe(0)
  })

  it("puts the 48th LP into IC5-2 and never goes negative", () => {
    for (const se of [12, 17, 50, 128]) {
      const result = run(se, 48)
      expect(result.levels["IC5-2"]).toBe(1)
      expect(result.unallocated).toBe(0)
      for (const level of Object.values(result.levels)) expect(level).toBeGreaterThanOrEqual(0)
    }
  })

  it("only buys extras once every usable row 5 talent has a point", () => {
    const row5 = ["PP5-1", "PP5-2", "PP5-3", "IC5-1", "IC5-2", "IC5-3"]
    let extrasStarted = false
    for (let lp = 48; lp <= 200; lp += 1) {
      const { levels, unallocated } = run(128, lp)
      expect(unallocated).toBe(0)
      if ((levels["PP1-1"] ?? 0) > 0) {
        extrasStarted = true
        for (const id of row5) expect(levels[id] ?? 0).toBeGreaterThanOrEqual(1)
      }
    }
    expect(extrasStarted).toBe(true)
    expect(run(8, 60).levels["PP5-1"] ?? 0).toBe(0)
  })

  it("never exceeds the 100 level cap on row 5", () => {
    const result = run(128, 5000)
    for (const id of ["PP5-1", "PP5-2", "PP5-3", "IC5-1", "IC5-2", "IC5-3"])
      expect(result.levels[id]).toBeLessThanOrEqual(100)
    expect(result.unallocated).toBeGreaterThanOrEqual(0)
  })
})

describe("getRow5Weights", () => {
  const weightsAt = (se: number) => getRow5Weights({ se, lp: 100, gCorpMaxed: false, perks: perksAt(se) })

  it("matches the spreadsheet IC weights", () => {
    expect(weightsAt(1)["IC5-1"]).toBeCloseTo(4.1726e-5, 8)
    expect(weightsAt(30)["IC5-1"]).toBeCloseTo(0.2057, 3)
    expect(weightsAt(31)["IC5-1"]).toBe(0.21)
    expect(weightsAt(36)["IC5-2"]).toBeCloseTo(1.031, 2)
    expect(weightsAt(37)["IC5-2"]).toBe(1.6)
  })

  it("unlocks PP weights from the perk colours", () => {
    expect(weightsAt(7)["PP5-3"]).toBe(0)
    expect(weightsAt(8)["PP5-3"]).toBe(0.295)
    expect(weightsAt(9)["PP5-2"]).toBe(0.195)
    expect(weightsAt(18)["PP5-1"]).toBe(0)
    expect(weightsAt(19)["PP5-1"]).toBe(1)
  })

  it("adds 0.1 to IC5-3 per recommended B7, O7 and Y7", () => {
    expect(weightsAt(8)["IC5-3"]).toBeCloseTo(1, 5)
    expect(weightsAt(9)["IC5-3"]).toBeCloseTo(1.1, 5)
    expect(weightsAt(22)["IC5-3"]).toBeCloseTo(1.2, 5)
    expect(weightsAt(30)["IC5-3"]).toBeCloseTo(1.3, 5)
  })
})
