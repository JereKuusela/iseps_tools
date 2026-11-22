import { describe, expect, it } from "vitest"
import { splitUpgradeItemResources } from "./upgradeItemResources"

describe("splitUpgradeItemResources", () => {
  it.each([
    ["Bulk Artifacts", ["artifacts"]],
    ["Bulk Scientists", ["scientist"]],
    ["Bulk Arch-Bots", ["arch-bots"]],
    ["Bulk Solutions", ["solutions"]],
    ["Bulk Rebirthologists", ["rebirthologist"]],
    ["Bulk Extractions", ["extractions"]],
    ["Bulk Researches", ["research"]],
    ["Bulk DC Milestones", ["dcm"]],
    ["Bulk Emblem Milestones", ["emblems"]],
    ["Bulk Emblems", ["emblems"]],
    ["Data Cube Gains", ["dc"]],
    ["SC Booster", ["sc"]],
    ["Extra LP", ["lp"]],
    ["Fenix institute bundle", ["institutes"]],
    ["Infinity Multi bundle", ["infinity"]],
    ["Cost upg scaler: DC", ["dc"]],
    ["All Particles Output", ["ap"]],
    ["Alpha-Beta bundle", ["alpha", "beta"]],
    ["A-B-C bundle", ["alpha", "beta", "ceti"]],
    ["D-E-F bundle", ["delta", "epsilon", "fenix"]],
    ["G-H-I bundle", ["gamma", "helion", "ixion"]],
    ["Cash Supplies", ["cash"]],
    ["Supplies Crystals", ["crystals"]],
    ["BB-Bot Tokens", ["tokens"]],
    ["BB-Bot Duration", ["duration"]],
    ["G-points", ["gp"]],
    ["G-point Booster", ["gp"]],
    ["Laboratory Bundle", ["scientist"]],
    ["Egetarium Bundle", ["artifacts"]],
    ["Archive Bundle", ["arch-bots"]],
    ["CoT Bundle", ["solutions"]],
    ["Simulation Bundle", ["sc"]],
    ["Singularity Bundle", ["sc"]],
    ["G-corp Bundle", ["gp"]],
    ["Corvus Bundle", ["corvus"]],
    ["Tiberius Bundle", ["emblems"]],
    ["Leveling Bundle", ["lp"]],
    ["Taskmaster Bundle", ["task"]],
    ["Ultima Bundle", []],
    ["Tycoon Bundle", []],
    ["Amp Counter", []],
  ])("maps %s without losing any of the original text", (name, resources) => {
    const parts = splitUpgradeItemResources(name)
    expect(parts.flatMap(({ resource }) => resource ?? [])).toEqual(resources)
    expect(parts.map(({ text }) => text).join("")).toBe(name)
  })

  it("keeps Max Lv visible beside the Infinity icon", () => {
    const parts = splitUpgradeItemResources("Infinity Max Lv")
    expect(parts.filter(({ text }) => text)).toEqual([
      { text: "Infinity", resource: "infinity" },
      { text: " Max Lv", resource: undefined },
    ])
  })

  it("uses the Infinity Amp icon for the whole name", () => {
    expect(splitUpgradeItemResources("Infinity Amp").filter(({ text }) => text)).toEqual([
      { text: "Infinity Amp", resource: "infinity-amp" },
    ])
  })
})
