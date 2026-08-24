import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const repoRoot = resolve(import.meta.dirname, "..")
const definitionsPath = resolve(repoRoot, "data", "token_upgrade_definitions.json")
const targetsPath = resolve(repoRoot, "data", "token_resource_targets.csv")
const outputPath = resolve(repoRoot, "data", "token_upgrade_levels.csv")

const parsed = JSON.parse(readFileSync(definitionsPath, "utf8"))
const upgrades = Array.isArray(parsed?.upgrades) ? parsed.upgrades : []

const SUPPLIES_MAX = 80
const MINUTES_PER_DAY = 1440
const TERM_OUTPUT_MULTIPLIER = 100000000
const OUTPUT_MAX_LEVEL = 1800
const POST_1000_PER_COST_MATCH_TOLERANCE = 0.02

const TARGET_LEVEL_BREAKPOINTS = [350, 1100, 1150, 1200, 1250, 1300, 1350, 1400]
const TARGET_RESOURCES = [
  "cash",
  "alpha",
  "beta",
  "ceti",
  "delta",
  "epsilon",
  "fenix",
  "gamma",
  "helion",
  "ixion",
  "juno",
  "kappa",
]
const SUPPLY_RESOURCES = ["cash", "alpha", "beta", "ceti", "delta", "epsilon", "fenix", "gamma", "helion"]

const asNumber = (value, fallback = 0) => {
  const parsedNumber = Number(value)
  return Number.isFinite(parsedNumber) ? parsedNumber : fallback
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const parseTargetRows = (rawCsv) => {
  const lines = rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) return []

  const [header, ...rows] = lines
  const resources = header.split(",")

  return rows.map((line, rowIndex) => {
    const values = line.split(",")
    const level = TARGET_LEVEL_BREAKPOINTS[rowIndex] ?? TARGET_LEVEL_BREAKPOINTS[TARGET_LEVEL_BREAKPOINTS.length - 1]
    const targetsByResource = {}

    for (let index = 0; index < resources.length; index += 1) {
      const resource = resources[index]
      targetsByResource[resource] = Math.max(0, asNumber(values[index], 0))
    }

    return {
      level,
      targetsByResource,
    }
  })
}

const buildResourceTargetMap = (rows) => {
  const map = new Map()

  for (const resource of TARGET_RESOURCES) {
    const levels = rows
      .map((row) => Math.max(0, asNumber(row.targetsByResource[resource], 0)))
      .filter((value) => value > 0)
      .sort((left, right) => left - right)

    map.set(resource, levels)
  }

  return map
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

const getEquivalentOutputLevelFromMultiplier = (multiplier) => {
  if (!Number.isFinite(multiplier) || multiplier <= 1) return 0
  if (multiplier <= 11) return clamp((multiplier - 1) / 0.01, 0, OUTPUT_MAX_LEVEL)

  const exponent = Math.log(multiplier / 11) / Math.log(1.01)
  return clamp(1000 + exponent, 0, OUTPUT_MAX_LEVEL)
}

const getSuppliesMultiplier = (supplies) => {
  const extraMinutes = (2 * supplies * SUPPLIES_MAX) / 60
  return 1 + extraMinutes / MINUTES_PER_DAY
}

const getSuppliesShortTermValue = (level) => {
  const suppliesLevelBefore = Math.max(0, level - 1)
  const suppliesLevelAfter = Math.max(0, level)
  const before = getSuppliesMultiplier(suppliesLevelBefore)
  const after = getSuppliesMultiplier(suppliesLevelAfter)
  if (before <= 0) return 0
  return Math.max(0, after / before - 1)
}

const getLegacyShortTermValue = (upgrade, level) => {
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

  if (upgrade.group === "supplies") {
    return getSuppliesShortTermValue(level)
  }

  return Math.max(0, asNumber(upgrade.baseValue, 0))
}

const getOutputLongTermPerCostByLevel = (upgrade, shortTermPerCostByLevel) => {
  const maxLevel = Math.max(1, Math.floor(asNumber(upgrade.maxLevel, 1)))
  const longTermPerCostByLevel = Array(maxLevel + 1).fill(null)

  if (maxLevel < 1001) return longTermPerCostByLevel

  const shortTermPerCostAt1001 = shortTermPerCostByLevel[1001] ?? 0
  const prefixShortTermPerCost = Array(maxLevel + 1).fill(0)

  for (let level = 1; level <= maxLevel; level += 1) {
    prefixShortTermPerCost[level] = prefixShortTermPerCost[level - 1] + shortTermPerCostByLevel[level]
  }

  const getAverageTerm = (startLevel, endLevel) => {
    const count = endLevel - startLevel + 1
    if (count <= 0) return 0
    const total = prefixShortTermPerCost[endLevel] - prefixShortTermPerCost[startLevel - 1]
    return total / count
  }

  const maxCandidateLevel = Math.min(1000, maxLevel)

  for (let level = 1; level <= maxCandidateLevel; level += 1) {
    const currentShortTermPerCost = shortTermPerCostByLevel[level] ?? 0
    if (!(currentShortTermPerCost < shortTermPerCostAt1001)) continue

    let bestAverageTerm = getAverageTerm(level, 1001)

    for (let endLevel = 1002; endLevel <= maxLevel; endLevel += 1) {
      const nextAverageTerm = getAverageTerm(level, endLevel)
      if (nextAverageTerm > bestAverageTerm) {
        bestAverageTerm = nextAverageTerm
      }
    }

    if (bestAverageTerm > currentShortTermPerCost) {
      longTermPerCostByLevel[level] = bestAverageTerm
    }
  }

  return longTermPerCostByLevel
}

const getPriorityForOutputLevel = (resource, outputLevel, resourceTargetMap) => {
  const targets = resourceTargetMap.get(resource) ?? []
  if (targets.length === 0) return 1

  const level = Math.max(0, outputLevel)
  const stageCount = targets.length

  if (level <= targets[0]) {
    const ratio = level / Math.max(1, targets[0])
    // Keep level-1 valuation higher and decay toward the first target breakpoint.
    return stageCount + (1 - ratio)
  }

  for (let index = 0; index < stageCount - 1; index += 1) {
    const start = targets[index]
    const end = targets[index + 1]
    if (level > end) continue

    const fromValue = stageCount - index
    const toValue = stageCount - index - 1
    const ratio = (level - start) / Math.max(1, end - start)
    return fromValue + (toValue - fromValue) * ratio
  }

  const tailStart = targets[stageCount - 1]
  const tailSpan = Math.max(1, OUTPUT_MAX_LEVEL - tailStart)
  const decay = (level - tailStart) / tailSpan
  return Math.max(0, 1 - decay)
}

const resolveSourceResources = (upgrade) => {
  if (upgrade.resource) return [upgrade.resource]

  if (upgrade.id === "supplies.tokenBonus" || upgrade.id === "supplies.crystalBonus") {
    return SUPPLY_RESOURCES
  }

  if (upgrade.id === "bbbot.duration" || upgrade.id === "bbbot.tokenBonus") {
    return SUPPLY_RESOURCES
  }

  return TARGET_RESOURCES
}

const combineSourcePriorities = (priorities) => {
  if (priorities.length === 0) return 1

  const best = Math.max(...priorities)
  if (best <= 0) return 0

  let weighted = 0
  for (const priority of priorities) {
    const relative = priority / best
    weighted += priority * relative
  }

  return weighted / priorities.length
}

const getEquivalentOutputLevel = (upgrade, level) => {
  if (upgrade.group === "output") return level

  if (upgrade.group === "bbbot") {
    const baseline = Math.max(1, asNumber(upgrade.baseline, 100))
    const multiplier = 1 + (baseline + Math.max(0, level)) / 100
    return getEquivalentOutputLevelFromMultiplier(multiplier)
  }

  if (upgrade.group === "supplies") {
    const multiplier = getSuppliesMultiplier(Math.max(0, level))
    return getEquivalentOutputLevelFromMultiplier(multiplier)
  }

  const baseValue = Math.max(0, asNumber(upgrade.baseValue, 0))
  const multiplier = 1 + baseValue * Math.max(0, level)
  return getEquivalentOutputLevelFromMultiplier(multiplier)
}

const getPriorityForUpgradeLevel = (upgrade, level, resourceTargetMap) => {
  const equivalentOutputLevel = getEquivalentOutputLevel(upgrade, level)
  const resources = resolveSourceResources(upgrade)
  const sourcePriorities = resources.map((resource) =>
    getPriorityForOutputLevel(resource, equivalentOutputLevel, resourceTargetMap),
  )
  return combineSourcePriorities(sourcePriorities)
}

const buildOutputPerCostByResource = (upgrades) => {
  const result = new Map()

  for (const upgrade of upgrades) {
    if (upgrade.group !== "output" || !upgrade.resource) continue

    const maxLevel = Math.max(1, Math.floor(asNumber(upgrade.maxLevel, 1)))
    const outputPerCostByLevel = Array(maxLevel + 1).fill(0)

    for (let level = 1; level <= maxLevel; level += 1) {
      const cost = getCostForLevel(upgrade, level)
      const outputIncrease = getLegacyShortTermValue(upgrade, level)
      outputPerCostByLevel[level] = cost <= 0 ? 0 : outputIncrease / cost
    }

    result.set(upgrade.resource, outputPerCostByLevel)
  }

  return result
}

const findOutputLongTermBridgeStart = (legacyShortPerCost, legacyLongPerCost, maxLevel) => {
  const upper = Math.min(1000, maxLevel)

  for (let level = 1; level <= upper; level += 1) {
    const shortTerm = legacyShortPerCost[level] ?? 0
    const longTerm = legacyLongPerCost[level]
    if (longTerm != null && longTerm > shortTerm) return level
  }

  return null
}

const findClosestMatchingLowerOutputLevelByPerCost = (legacyShortTermPerCostByLevel, level) => {
  if (level <= 1) return null

  const target = legacyShortTermPerCostByLevel[level]
  if (!Number.isFinite(target) || target <= 0) return null

  let bestLevel = null
  let bestDelta = Number.POSITIVE_INFINITY
  const upper = Math.min(1000, level - 1)

  for (let candidate = 1; candidate <= upper; candidate += 1) {
    const current = legacyShortTermPerCostByLevel[candidate]
    if (!Number.isFinite(current) || current <= 0) continue

    const delta = Math.abs(current - target)
    if (delta < bestDelta) {
      bestDelta = delta
      bestLevel = candidate
    }
  }

  if (bestLevel == null) return null

  const relativeDelta = bestDelta / target
  if (relativeDelta > POST_1000_PER_COST_MATCH_TOLERANCE) return null

  return bestLevel
}

const findClosestOutputLevelByPerCost = (targetPerCost, outputPerCostByLevel) => {
  if (!Number.isFinite(targetPerCost) || targetPerCost <= 0) return null
  if (!outputPerCostByLevel || outputPerCostByLevel.length <= 1) return null

  let bestLevel = null
  let bestDelta = Number.POSITIVE_INFINITY
  const upper = Math.min(1000, outputPerCostByLevel.length - 1)

  for (let level = 1; level <= upper; level += 1) {
    const currentPerCost = outputPerCostByLevel[level]
    if (!Number.isFinite(currentPerCost) || currentPerCost <= 0) continue

    const delta = Math.abs(currentPerCost - targetPerCost)
    if (delta < bestDelta) {
      bestDelta = delta
      bestLevel = level
    }
  }

  if (bestLevel == null) return null

  const relativeDelta = bestDelta / targetPerCost
  if (relativeDelta > POST_1000_PER_COST_MATCH_TOLERANCE) return null

  return bestLevel
}

const toFixedCost = (value) => {
  if (!Number.isFinite(value)) return "0"
  return value
    .toFixed(2)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
}

const toTermPrecision = (value) => {
  if (!Number.isFinite(value) || value <= 0) return "0"

  const significantDigits = 4
  const exponent = Math.floor(Math.log10(Math.abs(value)))
  const decimals = Math.max(0, significantDigits - exponent - 1)
  const rounded = Number.parseFloat(value.toPrecision(significantDigits))

  return rounded
    .toFixed(decimals)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
}

const targetRows = parseTargetRows(readFileSync(targetsPath, "utf8"))
const resourceTargetMap = buildResourceTargetMap(targetRows)
const outputPerCostByResource = buildOutputPerCostByResource(upgrades)

const lines = ["upgradeId,level,cost,shortTerm,longTerm"]

for (const upgrade of upgrades) {
  const maxLevel = Math.max(1, Math.floor(asNumber(upgrade.maxLevel, 1)))

  const costsByLevel = Array(maxLevel + 1).fill(0)
  const legacyShortTermsByLevel = Array(maxLevel + 1).fill(0)
  const legacyShortTermPerCostByLevel = Array(maxLevel + 1).fill(0)

  const prioritiesByLevel = Array(maxLevel + 1).fill(1)
  const priorityTermByLevel = Array(maxLevel + 1).fill(0)

  for (let level = 1; level <= maxLevel; level += 1) {
    const cost = getCostForLevel(upgrade, level)
    const legacyShortTerm = getLegacyShortTermValue(upgrade, level)
    const priority = getPriorityForUpgradeLevel(upgrade, level, resourceTargetMap)

    costsByLevel[level] = cost
    legacyShortTermsByLevel[level] = legacyShortTerm
    legacyShortTermPerCostByLevel[level] = cost <= 0 ? 0 : legacyShortTerm / cost
    prioritiesByLevel[level] = priority

    if (upgrade.group === "output") {
      // Output target valuation is already cost-aware through target rows.
      priorityTermByLevel[level] = priority
    } else if ((upgrade.group === "supplies" || upgrade.group === "bbbot") && upgrade.resource) {
      const targetPerCost = legacyShortTermPerCostByLevel[level]
      const outputPerCostByLevel = outputPerCostByResource.get(upgrade.resource)
      const matchedOutputLevel = findClosestOutputLevelByPerCost(targetPerCost, outputPerCostByLevel)

      if (matchedOutputLevel != null) {
        priorityTermByLevel[level] = getPriorityForOutputLevel(upgrade.resource, matchedOutputLevel, resourceTargetMap)
      } else {
        const priorityTermBase = priority * legacyShortTerm
        priorityTermByLevel[level] = cost <= 0 ? 0 : priorityTermBase / cost
      }
    } else {
      const priorityTermBase = priority * legacyShortTerm
      priorityTermByLevel[level] = cost <= 0 ? 0 : priorityTermBase / cost
    }
  }

  const legacyOutputLongTermPerCostByLevel =
    upgrade.group === "output" ? getOutputLongTermPerCostByLevel(upgrade, legacyShortTermPerCostByLevel) : null

  if (upgrade.group === "output") {
    for (let level = 1001; level <= maxLevel; level += 1) {
      const matchLevel = findClosestMatchingLowerOutputLevelByPerCost(legacyShortTermPerCostByLevel, level)
      if (matchLevel == null) continue
      // Keep post-1000 output following tail decay; per-cost remap can only lower, never raise.
      const matchedPriorityTerm = priorityTermByLevel[matchLevel] ?? 0
      priorityTermByLevel[level] = Math.min(priorityTermByLevel[level] ?? 0, matchedPriorityTerm)
    }
  }

  const priorityLongTermPerCostByLevel = Array(maxLevel + 1).fill(null)

  if (upgrade.group === "output" && legacyOutputLongTermPerCostByLevel) {
    const bridgeStart = findOutputLongTermBridgeStart(
      legacyShortTermPerCostByLevel,
      legacyOutputLongTermPerCostByLevel,
      maxLevel,
    )

    if (bridgeStart != null) {
      const bridgeValue = priorityTermByLevel[bridgeStart] ?? 0
      const upper = Math.min(1000, maxLevel)
      for (let level = bridgeStart; level <= upper; level += 1) {
        priorityLongTermPerCostByLevel[level] = bridgeValue
      }
    }
  }

  for (let level = 1; level <= maxLevel; level += 1) {
    const cost = costsByLevel[level]
    const shortTermPerCost = priorityTermByLevel[level]
    const longTermPerCost = priorityLongTermPerCostByLevel[level]

    const scaledShortTerm = shortTermPerCost * TERM_OUTPUT_MULTIPLIER
    const longTermCell =
      longTermPerCost == null ? "" : toTermPrecision(Math.max(0, longTermPerCost) * TERM_OUTPUT_MULTIPLIER)

    const row = [
      upgrade.id,
      String(level),
      toFixedCost(cost),
      toTermPrecision(Math.max(0, scaledShortTerm)),
      longTermCell,
    ]
    if (row[row.length - 1] === "") row.pop()
    lines.push(row.join(","))
  }
}

writeFileSync(outputPath, lines.join("\n") + "\n", "utf8")
console.log(`Generated ${lines.length - 1} token rows to ${outputPath}`)
