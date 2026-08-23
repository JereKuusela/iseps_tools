import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const repoRoot = resolve(import.meta.dirname, "..")
const inputPath = resolve(repoRoot, "data", "token_upgrade_definitions.json")
const outputPath = resolve(repoRoot, "data", "token_upgrade_levels.csv")

const parsed = JSON.parse(readFileSync(inputPath, "utf8"))
const upgrades = Array.isArray(parsed?.upgrades) ? parsed.upgrades : []

const asNumber = (value, fallback = 0) => {
  const parsedNumber = Number(value)
  return Number.isFinite(parsedNumber) ? parsedNumber : fallback
}

const getAnchorForLevel = (anchors, level) => {
  let chosen = anchors[0]
  for (const anchor of anchors) {
    if (anchor.level > level) break
    chosen = anchor
  }
  return chosen
}

const getCostForLevel = (upgrade, level) => {
  const anchors = [...(upgrade.costAnchors ?? [])]
    .map((anchor) => ({
      level: Math.max(1, Math.floor(asNumber(anchor.level, 1))),
      cost: Math.max(0, asNumber(anchor.cost, 0)),
      step: Math.max(0, asNumber(anchor.step, 0)),
    }))
    .sort((left, right) => left.level - right.level)

  if (anchors.length === 0) return 0

  const anchor = getAnchorForLevel(anchors, level)
  return Math.max(0, anchor.cost + (level - anchor.level) * anchor.step)
}

const getOutputMultiplier = (level) => {
  if (level <= 0) return 1
  if (level <= 1000) return 1 + level * 0.01
  return 11 * Math.pow(1.01, level - 1000)
}

const getShortTermValue = (upgrade, level) => {
  if (upgrade.group === "output") {
    const previousMultiplier = getOutputMultiplier(level - 1)
    const currentMultiplier = getOutputMultiplier(level)
    if (previousMultiplier <= 0) return 0
    return currentMultiplier / previousMultiplier - 1
  }

  if (upgrade.group === "bbbot") {
    const baseline = Math.max(1, asNumber(upgrade.baseline, 100))
    const before = baseline + Math.max(0, level - 1)
    const after = baseline + Math.max(0, level)
    return after / before - 1
  }

  return Math.max(0, asNumber(upgrade.baseValue, 0))
}

const getLongTermValue = (upgrade, level, shortTermValue) => {
  const maxLevel = Math.max(1, Math.floor(asNumber(upgrade.maxLevel, 1)))
  const remainingRatio = Math.max(0, (maxLevel - level) / maxLevel)

  if (upgrade.group === "output") {
    return shortTermValue * (1 + remainingRatio * 0.35)
  }

  return shortTermValue * (1 + remainingRatio * 0.15)
}

const toFixedCost = (value) => {
  if (!Number.isFinite(value)) return "0.00"
  return value.toFixed(2)
}

const TERM_SCALE = 100000000

const toScaledInt = (value) => {
  if (!Number.isFinite(value)) return "0"
  return String(Math.max(0, Math.round(value * TERM_SCALE)))
}

const lines = ["upgradeId,level,cost,shortTerm,longTerm"]

for (const upgrade of upgrades) {
  const maxLevel = Math.max(1, Math.floor(asNumber(upgrade.maxLevel, 1)))

  for (let level = 1; level <= maxLevel; level += 1) {
    const cost = getCostForLevel(upgrade, level)
    const shortTermValue = getShortTermValue(upgrade, level)
    const longTermValue = getLongTermValue(upgrade, level, shortTermValue)
    const shortTermPerCost = cost <= 0 ? 0 : shortTermValue / cost
    const longTermPerCost = cost <= 0 ? 0 : longTermValue / cost

    lines.push(
      [upgrade.id, String(level), toFixedCost(cost), toScaledInt(shortTermPerCost), toScaledInt(longTermPerCost)].join(
        ",",
      ),
    )
  }
}

writeFileSync(outputPath, lines.join("\n") + "\n", "utf8")
console.log(`Generated ${lines.length - 1} token rows to ${outputPath}`)
