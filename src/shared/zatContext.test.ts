import { describe, expect, it } from "vitest"
import techsJson from "../../data/techs.json"

describe("OG tech tooltip data", () => {
  it("stores tooltip text for each OG tech entry", () => {
    const techs = techsJson as Array<{ id: number; tooltip?: string }>

    for (const tech of techs) {
      expect(tech.tooltip, `OG${tech.id} should have tooltip text`).toBeTruthy()
    }
  })
})
