import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = resolve(import.meta.dirname, "..")
const targetsPath = resolve(repoRoot, "data", "token_resource_targets.csv")
const outputPath = resolve(repoRoot, "data", "token_upgrade_levels.csv")

const parseCsvRows = (rawCsv: string) =>
  rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(","))

const readOutputValueByKey = () => {
  const rows = parseCsvRows(readFileSync(outputPath, "utf8"))
  const [, ...dataRows] = rows
  const byKey = new Map<string, number>()

  for (const row of dataRows) {
    const [upgradeId, levelCell, , , valueCell] = row
    const value = Number(valueCell)
    if (!Number.isFinite(value)) continue
    byKey.set(`${upgradeId}:${levelCell}`, value)
  }

  return byKey
}

describe("generateTokenUpgradeCsv", () => {
  it("maps special efficiency to equivalent Alpha levels rather than scaling guide scores linearly", () => {
    const scores = readOutputValueByKey()
    const alphaEfficiency = (level: number) => 1 / (1 + (level - 1) / 100) ** 2
    const anchorEfficiency = (alphaEfficiency(50) + alphaEfficiency(51)) / 2
    const equivalentAlphaLevel = (efficiencyRatio: number) =>
      1 + 100 * (1 / Math.sqrt(anchorEfficiency * efficiencyRatio) - 1)
    const expectedEarlyAlphaScore = (level: number) => (13 - level / 350) * 100_000_000

    for (const [key, ratio] of [
      ["supplies.crystalBonus:2", 200 / 500],
      ["supplies.tokenBonus:1", 0.1 / 25 / (3 / 200)],
    ] as const) {
      const lowerLevel = Math.floor(equivalentAlphaLevel(ratio))
      const upperLevel = lowerLevel + 1
      const fraction =
        (alphaEfficiency(lowerLevel) - anchorEfficiency * ratio) /
        (alphaEfficiency(lowerLevel) - alphaEfficiency(upperLevel))
      const expected =
        expectedEarlyAlphaScore(lowerLevel) * (1 - fraction) + expectedEarlyAlphaScore(upperLevel) * fraction
      expect(scores.get(key), key).toBe(Math.round(expected))
    }
  })
  it("keeps Balanced scores for regular upgrades and rounds special scores to whole numbers", () => {
    const [header, ...rows] = parseCsvRows(readFileSync(outputPath, "utf8"))
    expect(header).toEqual(["upgradeId", "level", "cost", "accumulatedCost", "value"])
    expect(rows.every((row) => row.length === header.length && row[4] !== "" && Number.isFinite(Number(row[4])))).toBe(
      true,
    )
    const specialRows = rows.filter(([id]) =>
      /^(supplies\.(tokenBonus|crystalBonus)|bbbot\.(duration|tokenBonus))$/.test(id),
    )
    expect(specialRows.length).toBeGreaterThan(0)
    expect(specialRows.every((row) => /^\d+$/.test(row[4]))).toBe(true)

    const valueByKey = readOutputValueByKey()
    expect(valueByKey.get("output.cash:1000")).toBe((344_400_000 + 444_300_000) / 2)
    expect(valueByKey.get("output.cash:1001")).toBe(343_300_000)
  })

  it("keeps output values about equal at early target levels before long-term adjustments", () => {
    const targetRows = parseCsvRows(readFileSync(targetsPath, "utf8"))
    const [resources, ...stageRows] = targetRows
    const outputValueByKey = readOutputValueByKey()
    const lastLevelByResource = new Map(resources.map((resource) => [resource, Number.NEGATIVE_INFINITY]))

    const maxRelativeSpread = 0.02

    for (const [stageIndex, stageRow] of stageRows.slice(0, 3).entries()) {
      const values: number[] = []

      for (let index = 0; index < resources.length; index += 1) {
        const resource = resources[index]
        const level = Number(stageRow[index])
        if (!Number.isFinite(level) || level <= 0) continue

        const previousLevel = lastLevelByResource.get(resource) ?? Number.NEGATIVE_INFINITY
        if (level <= previousLevel) continue
        lastLevelByResource.set(resource, level)

        const key = `output.${resource}:${String(level)}`
        const value = outputValueByKey.get(key)
        expect(value, `missing row for stage ${stageIndex + 1}: ${key}`).toBeDefined()
        if (value != null) values.push(value)
      }

      expect(values.length, `no comparable values at stage ${stageIndex + 1}`).toBeGreaterThan(0)

      const maxValue = Math.max(...values)
      const minValue = Math.min(...values)
      const spread = (maxValue - minValue) / Math.max(1, maxValue)
      expect(spread, `spread too high at stage ${stageIndex + 1}`).toBeLessThanOrEqual(maxRelativeSpread)
    }
  })
})
