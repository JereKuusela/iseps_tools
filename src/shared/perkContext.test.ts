import { describe, expect, it } from "vitest"
import { fillPerkGaps, perkDataBundle } from "./perkContext"

describe("data has correct amount of perks", () => {
  it("has the correct number of perks for each SE", () => {
    const perks = perkDataBundle.perks
    for (const perk of perks) {
      const total = perk.perks.length + Object.values(perk.ipByRow ?? {}).reduce((sum, value) => sum + value, 0)
      expect(total, `SE${perk.se} ${perk.run} has ${total} perks, expected ${perk.se}`).toEqual(perk.se)
    }
  })
})
