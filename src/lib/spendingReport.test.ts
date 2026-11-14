import { describe, expect, it } from "vitest"
import { sortSpendingRows, type SpendingReportRow, type SpendingReportSort } from "./spendingReport"

const rows: SpendingReportRow[] = [
  { id: "beta", name: "Beta", group: "output", level: 2, maxLevel: 10, spent: 30 },
  { id: "alpha", name: "Alpha", group: "output", level: 5, maxLevel: 10, spent: 10 },
  { id: "zero", name: "Zero", group: "output", level: 0, maxLevel: 10, spent: 0 },
  { id: "gamma", name: "Gamma", group: "output", level: 1, maxLevel: 10, spent: 20 },
]

describe("sortSpendingRows", () => {
  it("keeps game order by default and excludes unpurchased upgrades", () => {
    expect(sortSpendingRows(rows, null).map((row) => row.id)).toEqual(["beta", "alpha", "gamma"])
    expect(sortSpendingRows([], null)).toEqual([])
  })

  it.each<{ column: SpendingReportSort["column"]; expected: string[] }>([
    { column: "name", expected: ["alpha", "beta", "gamma"] },
    { column: "level", expected: ["gamma", "beta", "alpha"] },
    { column: "spent", expected: ["alpha", "gamma", "beta"] },
  ])("sorts $column in both directions without changing source rows", ({ column, expected }) => {
    expect(sortSpendingRows(rows, { column, direction: "ascending" }).map((row) => row.id)).toEqual(expected)
    expect(sortSpendingRows(rows, { column, direction: "descending" }).map((row) => row.id)).toEqual(
      [...expected].reverse(),
    )
    expect(rows.map((row) => row.id)).toEqual(["beta", "alpha", "zero", "gamma"])
  })
})
