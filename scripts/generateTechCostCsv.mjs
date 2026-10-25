import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const repoRoot = resolve(import.meta.dirname, "..")
const techsPath = resolve(repoRoot, "data", "techs.json")
const outputPath = resolve(repoRoot, "data", "tech_costs.csv")

const techs = JSON.parse(readFileSync(techsPath, "utf8"))

// Mirrors src/lib/largeNumber.ts LargeNumber (mantissa, exponent) normalization/multiply.
const normalize = (mantissa, exponent) => {
  if (!Number.isFinite(mantissa) || !Number.isFinite(exponent) || mantissa === 0) {
    return { mantissa: 0, exponent: 0 }
  }

  const magnitude = Math.floor(Math.log10(Math.abs(mantissa)))
  return { mantissa: mantissa / 10 ** magnitude, exponent: exponent + magnitude }
}

const multiply = (a, b) => {
  if (a.mantissa === 0 || b.mantissa === 0) return { mantissa: 0, exponent: 0 }
  return normalize(a.mantissa * b.mantissa, a.exponent + b.exponent)
}

const formatCost = (cost) => {
  if (cost.mantissa === 0) return "0"
  const mantissaStr = cost.mantissa.toPrecision(12).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
  return `${mantissaStr}e${cost.exponent}`
}

const lines = ["id,level,cost"]

for (const tech of techs) {
  const maxLevel = Math.max(1, Math.floor(tech.maxLevel ?? 999))
  const costCurve = [...(tech.costCurve ?? [])].sort((a, b) => a.level - b.level)

  let cost = normalize(tech.initCost, 0)
  let growth = { mantissa: 1, exponent: 0 }
  let curveIndex = 0

  for (let level = 1; level <= maxLevel; level += 1) {
    lines.push(`${tech.id},${level},${formatCost(cost)}`)

    while (curveIndex < costCurve.length && costCurve[curveIndex].level === level) {
      const { mult, single } = costCurve[curveIndex]
      growth = multiply(growth, normalize(mult, 0))
      if (single) cost = multiply(cost, normalize(single, 0))
      curveIndex += 1
    }

    cost = multiply(cost, growth)
  }
}

writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8")
