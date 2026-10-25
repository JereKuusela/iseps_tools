import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = resolve(import.meta.dirname, "..")
const techsPath = resolve(repoRoot, "data", "techs.json")
const outputPath = resolve(repoRoot, "data", "tech_costs.csv")

type TechCurveRule = {
  level: number
  mult: number
  single?: number
}

type Tech = {
  id: number
  initCost: number
  costCurve: TechCurveRule[]
  maxLevel?: number
}

type LargeValue = {
  mantissa: number
  exponent: number
}

const normalize = (mantissa: number, exponent: number): LargeValue => {
  if (!Number.isFinite(mantissa) || !Number.isFinite(exponent) || mantissa === 0) {
    return { mantissa: 0, exponent: 0 }
  }

  const magnitude = Math.floor(Math.log10(Math.abs(mantissa)))
  return { mantissa: mantissa / 10 ** magnitude, exponent: exponent + magnitude }
}

const multiply = (a: LargeValue, b: LargeValue): LargeValue => {
  if (a.mantissa === 0 || b.mantissa === 0) return { mantissa: 0, exponent: 0 }
  return normalize(a.mantissa * b.mantissa, a.exponent + b.exponent)
}

const parseCsvRows = (rawCsv: string) =>
  rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(","))

const readOutputCostByKey = () => {
  const rows = parseCsvRows(readFileSync(outputPath, "utf8"))
  const [, ...dataRows] = rows
  const byKey = new Map<string, LargeValue>()

  for (const [id, level, cost] of dataRows) {
    const match = cost.match(/^([+-]?\d+(?:\.\d+)?)e([+-]?\d+)$/)
    if (!match) continue
    byKey.set(`${id}:${level}`, { mantissa: Number(match[1]), exponent: Number(match[2]) })
  }

  return byKey
}

describe("generateTechCostCsv", () => {
  const techs: Tech[] = JSON.parse(readFileSync(techsPath, "utf8"))
  const outputCostByKey = readOutputCostByKey()

  it("has a precomputed row for every level of every tech", () => {
    const expectedRowCount = techs.reduce((sum, tech) => sum + Math.max(1, Math.floor(tech.maxLevel ?? 999)), 0)
    expect(outputCostByKey.size).toBe(expectedRowCount)
  })

  it("matches costs recomputed independently from techs.json growth rules", () => {
    for (const tech of techs) {
      const maxLevel = Math.max(1, Math.floor(tech.maxLevel ?? 999))
      const costCurve = [...tech.costCurve].sort((a, b) => a.level - b.level)

      let cost = normalize(tech.initCost, 0)
      let growth: LargeValue = { mantissa: 1, exponent: 0 }
      let curveIndex = 0

      for (let level = 1; level <= maxLevel; level += 1) {
        const stored = outputCostByKey.get(`${tech.id}:${level}`)
        expect(stored, `missing row for tech ${tech.id} level ${level}`).toBeDefined()

        if (stored) {
          expect(stored.exponent, `exponent mismatch for tech ${tech.id} level ${level}`).toBe(cost.exponent)
          expect(stored.mantissa, `mantissa mismatch for tech ${tech.id} level ${level}`).toBeCloseTo(cost.mantissa, 6)
        }

        while (curveIndex < costCurve.length && costCurve[curveIndex].level === level) {
          const { mult, single } = costCurve[curveIndex]
          growth = multiply(growth, normalize(mult, 0))
          if (single) cost = multiply(cost, normalize(single, 0))
          curveIndex += 1
        }

        cost = multiply(cost, growth)
      }
    }
  })
})
