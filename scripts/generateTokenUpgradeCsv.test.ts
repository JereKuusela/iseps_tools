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

const readOutputShortTermByKey = () => {
  const rows = parseCsvRows(readFileSync(outputPath, "utf8"))
  const [, ...dataRows] = rows
  const byKey = new Map<string, number>()

  for (const row of dataRows) {
    const [upgradeId, levelCell, , shortTermCell] = row
    const shortTerm = Number(shortTermCell)
    if (!Number.isFinite(shortTerm)) continue
    byKey.set(`${upgradeId}:${levelCell}`, shortTerm)
  }

  return byKey
}

describe("generateTokenUpgradeCsv", () => {
  it("keeps output values about equal at target levels", () => {
    const targetRows = parseCsvRows(readFileSync(targetsPath, "utf8"))
    const [resources, ...stageRows] = targetRows
    const outputShortTermByKey = readOutputShortTermByKey()
    const lastLevelByResource = new Map(resources.map((resource) => [resource, Number.NEGATIVE_INFINITY]))

    const maxRelativeSpread = 0.02

    for (const [stageIndex, stageRow] of stageRows.entries()) {
      const values: number[] = []

      for (let index = 0; index < resources.length; index += 1) {
        const resource = resources[index]
        const level = Number(stageRow[index])
        if (!Number.isFinite(level) || level <= 0) continue

        const previousLevel = lastLevelByResource.get(resource) ?? Number.NEGATIVE_INFINITY
        if (level <= previousLevel) continue
        lastLevelByResource.set(resource, level)

        const key = `output.${resource}:${String(level)}`
        const shortTerm = outputShortTermByKey.get(key)
        expect(shortTerm, `missing row for stage ${stageIndex + 1}: ${key}`).toBeDefined()
        if (shortTerm != null) values.push(shortTerm)
      }

      expect(values.length, `no comparable values at stage ${stageIndex + 1}`).toBeGreaterThan(0)

      const maxValue = Math.max(...values)
      const minValue = Math.min(...values)
      const spread = (maxValue - minValue) / Math.max(1, maxValue)
      expect(spread, `spread too high at stage ${stageIndex + 1}`).toBeLessThanOrEqual(maxRelativeSpread)
    }
  })
})
