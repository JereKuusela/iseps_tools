import { describe, expect, it } from "vitest"
import { splitTooltipResources } from "./tooltipResources"

describe("splitTooltipResources", () => {
  it("uses the marker text as the icon id when no label is given", () => {
    expect(splitTooltipResources("+1% [[Solutions]] and [[dc|Data Cubes]]!")).toEqual([
      { text: "+1% " },
      { text: "Solutions", resource: "solutions" },
      { text: " and " },
      { text: "Data Cubes", resource: "dc" },
      { text: "!" },
    ])
  })

  it("leaves unmarked text alone", () => {
    expect(splitTooltipResources("Solutions and DC")).toEqual([{ text: "Solutions and DC" }])
  })

  it.each([
    ["+0.4% [[Beta]], [[Ceti]] and [[Delta]] per Alpha", "+0.4% Beta Ceti Delta per Alpha"],
    ["[[Cash]] and production", "Cash and production"],
    ["[[Cash]], and +2% [[DC]]", "Cash, and +2% DC"],
  ])("compacts only separators between icons in %s", (line, compact) => {
    expect(
      splitTooltipResources(line, true)
        .map(({ text }) => text)
        .join(""),
    ).toBe(compact)
  })
})
