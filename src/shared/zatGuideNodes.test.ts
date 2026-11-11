import { describe, expect, it } from "vitest"
import zatGuidesJson from "../../data/zat_guides.json"
import { buildGuideNodeAmountMap, parseGuideNodes } from "./zatGuideNodes"

describe("parseGuideNodes", () => {
  it("stores all guide node selections as strings", () => {
    for (const guide of zatGuidesJson) {
      expect(guide.nodes.every((node) => typeof node === "string")).toBe(true)
    }
  })

  it("parses string node amounts and adds missing prerequisites at level one", () => {
    const requirements = [
      { id: "centre" },
      { id: "alpha", req: "centre" },
      { id: "helion", req: "alpha" },
      { id: "juno", req: "helion" },
      { id: "artifacts", req: "juno" },
      { id: "dc", req: "centre" },
    ]

    const nodes = parseGuideNodes(["3 alpha", "artifacts", "dc", "unknown", "0 alpha"], requirements)

    expect(buildGuideNodeAmountMap(nodes)).toEqual(
      new Map([
        ["alpha", 3],
        ["artifacts", 1],
        ["dc", 1],
        ["juno", 1],
        ["helion", 1],
        ["centre", 1],
      ]),
    )
  })

  it("preserves explicit node amounts", () => {
    const nodes = parseGuideNodes(
      ["3 alpha", "helion"],
      [{ id: "centre" }, { id: "alpha", req: "centre" }, { id: "helion", req: "alpha" }],
    )

    expect(buildGuideNodeAmountMap(nodes)).toEqual(
      new Map([
        ["alpha", 3],
        ["helion", 1],
        ["centre", 1],
      ]),
    )
  })
})
