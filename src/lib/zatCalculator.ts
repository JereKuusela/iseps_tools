import cyclesJson from "../../data/cycles.json"
import premiumJson from "../../data/juno_premium.json"
import techsSeEffectJson from "../../data/techs_se_effect.json"
import techsJson from "../../data/techs.json"
import zatGuidesJson from "../../data/zat_guides.json"
import zatNodesJson from "../../data/zat_nodes.json"
import { LargeNumber } from "./largeNumber"
import { buildGuideNodeAmountMap, parseGuideNodes } from "./zatGuideNodes"

export type ZatMode = "juno" | "dc"

type CycleRule = {
  cycle: number
  mult: number
}

type SeEffectRule = {
  se: number
  kind: "mul" | "div"
  value: number
}

type TechCurveRule = {
  level: number
  mult: number
  single?: number
}

type TechData = {
  id: number
  initCost: number
  costCurve: TechCurveRule[]
  dcBoost?: number
  junoBase?: number
  extraJunoBase?: number
  extraJunoExp?: number
  seMultiplier?: number
  seAdditive?: number
}

type ZatNodeData = {
  id: string
  maxLv?: number
  techMul: number
  shareMul?: number
  junoMul?: number
  dcMul?: number
  sqrt?: boolean
}

type ZatGuideData = {
  cycle: number
  run: "se" | "jrun" | "crun" | "grun"
  nodes: Array<{
    id: string
    amount?: number
  }>
}

const parseZatGuides = (raw: ZatGuideData[]) => {
  return raw.map((entry) => ({
    cycle: entry.cycle,
    run: entry.run,
    nodes: parseGuideNodes(entry.nodes),
  }))
}

type PremiumMode = "add" | "mul" | "expAdd"

type PremiumRule = {
  name: string
  min?: number
  max?: number
  value: number
  mode: PremiumMode
}

const cycleRules: CycleRule[] = (cyclesJson as CycleRule[]).slice().sort((a, b) => a.cycle - b.cycle)

const cycleMultiplierIncreases = cycleRules.reduce((map, rule) => {
  const current = map.get(rule.cycle) ?? 0
  map.set(rule.cycle, current + rule.mult)
  return map
}, new Map<number, number>())

const seRules: SeEffectRule[] = (techsSeEffectJson as SeEffectRule[]).slice().sort((a, b) => a.se - b.se)

const techs: TechData[] = (techsJson as TechData[]).slice().sort((a, b) => a.id - b.id)

const premiumRules: PremiumRule[] = premiumJson as PremiumRule[]
const zatNodes: ZatNodeData[] = (zatNodesJson as ZatNodeData[]).slice()
const junoGuides: ZatGuideData[] = parseZatGuides(zatGuidesJson as ZatGuideData[])
  .filter((entry) => entry.run === "jrun")
  .slice()
  .sort((a, b) => a.cycle - b.cycle)

export type TechCostEntry = {
  level: number
  cost: LargeNumber
}

export type TechBoostResult = {
  rawTechBoost: number
  finalBoost: number
  og0Boost: number
}

export type PremiumInput = Record<string, number | boolean | undefined>

export type ExponentIncreaseEntry = {
  delta: number
  multiplier: number
}

export type NextZatCostResult = { cycle: number; cost: LargeNumber }

export type Og0BoostContext = {
  cycles: number
  techLevels: number[]
  junoExponent: number
  gains: LargeNumber
  exponentDeltaMultiplier: number
}

export type RankedTechRowIntermediate = {
  id: number
  currentLevel: number
  nextLevel: number | null
  nextCost: LargeNumber | null
  score: number
  relative: number
  etaSeconds: number
  rawTechBoost: number
  finalTechBoost: number
  og0Boost: number
}

export type RankedTechSnapshotInput = {
  cycles: number
  mode: ZatMode
  junoExponent: number
  seAmount: number
  currentJuno: LargeNumber
  gainPerSecond: LargeNumber
  techLevels: number[]
  exponentDeltaMultiplier: number
}

export type RankedTechSnapshot = {
  seEffect: number
  zatBoost: number
  rows: RankedTechRowIntermediate[]
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}

const toSafeNumber = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

const normalizeKey = (value: string) => {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

const resolvePurchaseAmount = (rule: PremiumRule, input: PremiumInput) => {
  const direct = input[rule.name]
  if (typeof direct === "boolean") return direct ? 1 : 0
  if (typeof direct === "number") return toSafeNumber(direct)

  const normalizedName = normalizeKey(rule.name)
  for (const [key, rawValue] of Object.entries(input)) {
    if (normalizeKey(key) !== normalizedName) continue
    if (typeof rawValue === "boolean") return rawValue ? 1 : 0
    if (typeof rawValue === "number") return toSafeNumber(rawValue)
  }

  if (normalizedName.includes("token")) {
    const tokenAmount = input.tokens
    if (typeof tokenAmount === "boolean") return tokenAmount ? 1 : 0
    if (typeof tokenAmount === "number") return toSafeNumber(tokenAmount)
  }

  return 0
}

const getTechById = (id: number): TechData => {
  const tech = techs.find((entry) => entry.id === id)
  if (!tech) {
    throw new Error(`Unknown tech id: ${id}`)
  }
  return tech
}

const largeFromPow10 = (exponent: number): LargeNumber => {
  const exponentFloor = Math.floor(exponent)
  const fractional = exponent - exponentFloor
  return new LargeNumber(10 ** fractional, exponentFloor)
}

const log10LargeNumber = (value: LargeNumber) => {
  if (value.isZero()) return Number.NEGATIVE_INFINITY
  return Math.log10(Math.abs(value.mantissa)) + value.exponent
}

const findActiveSeRule = (kind: "mul" | "div", seAmount: number): SeEffectRule | null => {
  let active: SeEffectRule | null = null
  for (const rule of seRules) {
    if (rule.kind !== kind) continue
    if (rule.se > seAmount) continue
    active = rule
  }
  return active
}

const safeLog10 = (value: number) => {
  if (value <= 0) return Number.NEGATIVE_INFINITY
  return Math.log10(value)
}

const estimateSeconds = (cost: LargeNumber, current: LargeNumber, gainPerSecond: LargeNumber) => {
  if (gainPerSecond.compare(0) <= 0) return Number.POSITIVE_INFINITY
  if (cost.compare(current) <= 0) return 0

  const remaining = cost.subtract(current).divide(gainPerSecond)
  if (remaining.exponent > 12) return Number.POSITIVE_INFINITY
  return remaining.mantissa * 10 ** remaining.exponent
}

const logScore = (value: number, cost: LargeNumber) => {
  return Math.log10(value) - Math.log10(cost.mantissa) - cost.exponent
}

const findJunoGuideForCycles = (cycles: number) => {
  const totalCycles = Math.max(1, Math.floor(cycles))

  let selectedGuide: ZatGuideData | null = null
  for (const guide of junoGuides) {
    if (guide.cycle > totalCycles) break
    selectedGuide = guide
  }

  return selectedGuide
}

const buildNodeLevelMap = (guide: ZatGuideData) => {
  return buildGuideNodeAmountMap(guide.nodes)
}

const calculateNodeJunoBaseBoost = (nodeLevelById: Map<string, number>) => {
  let total = 1

  for (const node of zatNodes) {
    const maxLevel = Math.max(1, node.maxLv ?? 1)
    const nodeLevels = Math.min(maxLevel, nodeLevelById.get(node.id) ?? 0)
    if (nodeLevels <= 0) continue

    let nodeMultiplier = 1 + nodeLevels * (node.junoMul ?? 0)
    if (node.sqrt) {
      nodeMultiplier = Math.sqrt(nodeMultiplier)
    }

    total *= nodeMultiplier
  }

  return Math.max(total, Number.EPSILON)
}

const getGrowthMultiplierAtLevel = (id: number, level: number, gains: LargeNumber) => {
  const clampedLevel = Math.max(0, Math.floor(level))
  if (clampedLevel <= 0) return 10 ** (Math.log10(techs[id].initCost) - gains.exponent)

  const curve = techCostCurve[id]
  let growth = 1

  for (const rule of curve) {
    if (rule.level > clampedLevel) break
    growth *= rule.mult
  }
  return Math.max(growth, 1 + Number.EPSILON)
}

const calculateOg0TotalBoostForGuide = (context: Og0BoostContext, selectedGuide: ZatGuideData | null) => {
  if (!selectedGuide) return 1

  const levels = context.techLevels
  let totalBoostDenom = 0

  for (const tech of techs) {
    if (tech.id == 0 || tech.id > 15) continue

    const currentLevel = Math.max(0, Math.floor(levels[tech.id] ?? 0))
    if (currentLevel <= 0) continue

    const logGrowth = safeLog10(getGrowthMultiplierAtLevel(tech.id, currentLevel, context.gains))
    if (!Number.isFinite(logGrowth) || logGrowth <= 0) continue

    totalBoostDenom += 1 / logGrowth
  }

  const og0Level = Math.max(0, Math.floor(levels[0] ?? 0))
  const og0GrowthLog = safeLog10(getGrowthMultiplierAtLevel(0, og0Level, context.gains))
  if (!Number.isFinite(og0GrowthLog) || og0GrowthLog <= 0) return 1

  const exponentMultiplier = Math.max(context.exponentDeltaMultiplier, 1 + Number.EPSILON)
  const exponentMultiplierLog = safeLog10(exponentMultiplier)
  const denominatorBase = 1 - exponentMultiplierLog / og0GrowthLog
  if (!Number.isFinite(denominatorBase) || denominatorBase <= Number.EPSILON) return 1

  const og0BoostDenom = 1 / denominatorBase

  const nodeLevels = buildNodeLevelMap(selectedGuide)
  const junoNodeBoost = calculateNodeJunoBaseBoost(nodeLevels)
  const junoNodeBoostLog = safeLog10(junoNodeBoost)
  const finalDenominator = 1 - totalBoostDenom * Math.max(0, context.junoExponent) * junoNodeBoostLog
  if (!Number.isFinite(finalDenominator) || finalDenominator <= Number.EPSILON) return 1

  const totalBoost = og0BoostDenom / finalDenominator
  if (!Number.isFinite(totalBoost) || totalBoost <= 0) return 1
  return totalBoost
}

export const calculateOg0TotalBoostFromGuide = (cycles: number, context: Omit<Og0BoostContext, "cycles">): number => {
  const selectedGuide = findJunoGuideForCycles(cycles)
  if (!selectedGuide) return 1

  return calculateOg0TotalBoostForGuide({ cycles, ...context }, selectedGuide)
}

const calculateOg0RawTechBoost = (context: Og0BoostContext, selectedGuide: ZatGuideData | null) => {
  const totalBoost = calculateOg0TotalBoostForGuide(context, selectedGuide)
  const exponentMultiplier = Math.max(context.exponentDeltaMultiplier, 1)
  const rawBoost = exponentMultiplier ** totalBoost

  if (!Number.isFinite(rawBoost) || rawBoost <= 1) return 1
  return rawBoost
}

const calculateNonOg0RawTechBoost = (tech: TechData, seEffect: number) => {
  const base = tech.junoBase ?? 1
  if (base === 1) return 1

  const seAdditive = tech.seAdditive ?? 0
  const seMultiplier = tech.seMultiplier ?? 1
  const exponent = seAdditive + seMultiplier * Math.max(0, seEffect)
  let rawBoost = base ** exponent

  if (tech.extraJunoBase && tech.extraJunoExp) {
    rawBoost *= tech.extraJunoBase ** tech.extraJunoExp
  }

  return rawBoost
}

const calculateTechOg0Contribution = (tech: TechData, boost: number, levels: number[], gains: LargeNumber) => {
  if (tech.id == 0) return 0

  const currentLevel = Math.max(0, Math.floor(levels[tech.id] ?? 0))

  const growthLog = safeLog10(getGrowthMultiplierAtLevel(tech.id, currentLevel, gains))
  if (!Number.isFinite(growthLog) || growthLog <= Number.EPSILON) return 0

  const contribution = Math.log10(boost) / growthLog
  if (!Number.isFinite(contribution) || contribution <= 0) return 0

  return contribution
}

const calculateOg0FinalBoostFromTechResults = (
  zatBoost: number,
  rawOg0TechBoost: number,
  techBoosts: Map<number, TechBoostResult>,
) => {
  let sum = 0
  for (const [id, boost] of techBoosts) {
    if (id === 0) continue
    sum += boost.og0Boost
  }
  const effectiveTechBoost = Math.max(zatBoost, Number.EPSILON) * rawOg0TechBoost
  const finalBoost = rawOg0TechBoost < 1 ? rawOg0TechBoost ** sum : Math.log(effectiveTechBoost ** sum)

  return {
    og0Boost: sum,
    finalBoost,
  }
}

export const calculateZatBoostPerTech = (
  cycles: number,
  mode: ZatMode,
  junoExponent: number,
  junoRecursive: number,
) => {
  const selectedGuide = findJunoGuideForCycles(cycles)

  if (!selectedGuide) return 1

  const nodeLevelById = buildNodeLevelMap(selectedGuide)

  let junoTotal = 1
  let dcTotal = 1
  for (const node of zatNodes) {
    const maxLevel = Math.max(1, node.maxLv ?? 1)
    const nodeLevels = Math.min(maxLevel, nodeLevelById.get(node.id) ?? 0)
    if (nodeLevels <= 0) continue
    let totalJunoMultiplier = 1 + nodeLevels * (node.junoMul ?? 0)
    if (node.sqrt) {
      totalJunoMultiplier = Math.sqrt(totalJunoMultiplier)
    }
    const nodeJunoBoost = totalJunoMultiplier ** (junoExponent * junoRecursive)
    junoTotal *= nodeJunoBoost

    const nodeDcBoost = 1 + nodeLevels * (node.dcMul ?? 0)
    dcTotal *= nodeJunoBoost * nodeDcBoost ** 1.48
  }
  if (mode === "juno") return junoTotal
  return dcTotal
}

export const calculateSeEffect = (seAmount: number) => {
  const normalizedSe = Math.max(0, Math.floor(seAmount))
  const mulRule = findActiveSeRule("mul", normalizedSe)
  const divRule = findActiveSeRule("div", normalizedSe)

  const multiplier = mulRule?.value ?? 0
  const divider = divRule?.value ?? 1

  if (divider <= 0) return 0
  return multiplier / divider
}

const techCostCurve = techs.map((tech) => tech.costCurve.sort((a, b) => a.level - b.level))
const techCostCache = techs.map(() => [] as LargeNumber[])

export const calculateNextThreeTechCosts = (id: number, currentLevel: number): TechCostEntry[] => {
  // No point to always recalculate.
  const cache = techCostCache[id]
  if (cache.length > currentLevel + 2) {
    return [
      { level: currentLevel + 1, cost: cache[currentLevel] },
      { level: currentLevel + 2, cost: cache[currentLevel + 1] },
      { level: currentLevel + 3, cost: cache[currentLevel + 2] },
    ]
  }

  const tech = getTechById(id)
  const costCurve = techCostCurve[id]

  const targetLevel = currentLevel + 3

  let cost = LargeNumber.from(tech.initCost)
  let growth = new LargeNumber(1, 0)
  let curveIndex = 0

  const nextCosts: TechCostEntry[] = []

  for (let level = 1; level <= targetLevel; level += 1) {
    cache[level - 1] = cost
    if (level > currentLevel) {
      nextCosts.push({ level, cost })
    }

    while (curveIndex < costCurve.length && costCurve[curveIndex].level === level) {
      const { mult, single } = costCurve[curveIndex]
      growth = growth.multiply(mult)
      if (single) cost = cost.multiply(single)

      curveIndex += 1
    }

    cost = cost.multiply(growth)
  }
  return nextCosts
}

export const calculateTechBoost = (
  zatBoost: number,
  seEffect: number,
  id: number,
  mode: ZatMode,
  og0Context: Og0BoostContext,
): TechBoostResult => {
  const tech = getTechById(id)
  const effectiveZatBoost = Math.max(zatBoost, Number.EPSILON)

  if (id === 0) {
    throw new Error("calculateTechBoost does not support id 0; OG0 is derived in calculateRankedTechSnapshot")
  }

  let rawTechBoost = 1
  let finalBoost = 1
  let og0Boost = 0

  if (mode === "dc") {
    rawTechBoost = tech.dcBoost ?? 1
  } else {
    rawTechBoost = calculateNonOg0RawTechBoost(tech, seEffect)
  }
  const boost = effectiveZatBoost * rawTechBoost
  og0Boost = calculateTechOg0Contribution(tech, boost, og0Context.techLevels, og0Context.gains)
  finalBoost = Math.log(boost)

  return {
    rawTechBoost,
    finalBoost,
    og0Boost,
  }
}

export const calculateTechValues = (input: RankedTechSnapshotInput): RankedTechSnapshot => {
  const normalizedCycles = Math.max(0, Math.floor(input.cycles))
  const gains = input.gainPerSecond
  const seEffect = calculateSeEffect(input.seAmount)
  const junoRecursive = calculateOg0TotalBoostFromGuide(normalizedCycles, {
    techLevels: input.techLevels,
    junoExponent: input.junoExponent,
    gains,
    exponentDeltaMultiplier: input.exponentDeltaMultiplier,
  })

  const zatBoost = calculateZatBoostPerTech(normalizedCycles, input.mode, input.junoExponent, junoRecursive)

  const rows: RankedTechRowIntermediate[] = []

  const techBoosts = new Map<number, TechBoostResult>()
  const og0Context: Og0BoostContext = {
    cycles: normalizedCycles,
    techLevels: input.techLevels,
    junoExponent: input.junoExponent,
    gains,
    exponentDeltaMultiplier: input.exponentDeltaMultiplier,
  }
  // First pass: compute all per-tech boosts.
  for (const tech of techs) {
    if (tech.id === 0) continue
    const boost = calculateTechBoost(zatBoost, seEffect, tech.id, input.mode, og0Context)
    techBoosts.set(tech.id, boost)
  }
  // Derive OG0 from first-pass non-OG0 results.
  const selectedGuide = findJunoGuideForCycles(normalizedCycles)
  const rawOg0TechBoost = calculateOg0RawTechBoost(og0Context, selectedGuide)
  const og0Derived = calculateOg0FinalBoostFromTechResults(zatBoost, rawOg0TechBoost, techBoosts)
  techBoosts.set(0, {
    rawTechBoost: rawOg0TechBoost,
    finalBoost: og0Derived.finalBoost,
    og0Boost: og0Derived.og0Boost,
  })

  // Second pass: compute costs and scores using prepared boosts.
  for (const tech of techs) {
    const currentLevel = Math.max(0, Math.floor(input.techLevels[tech.id] ?? 0))
    const nextThree = calculateNextThreeTechCosts(tech.id, currentLevel)
    const boost = techBoosts.get(tech.id) ?? { rawTechBoost: 1, finalBoost: 1, og0Boost: 0 }

    const next = nextThree[0] ?? null
    rows.push({
      id: tech.id,
      currentLevel,
      nextLevel: next?.level ?? null,
      nextCost: next?.cost ?? null,
      score: next ? logScore(boost.finalBoost, next.cost) : Number.NEGATIVE_INFINITY,
      relative: 0,
      etaSeconds: next ? estimateSeconds(next.cost, input.currentJuno, input.gainPerSecond) : Number.POSITIVE_INFINITY,
      rawTechBoost: boost.rawTechBoost,
      finalTechBoost: boost.finalBoost,
      og0Boost: boost.og0Boost,
    })
  }

  const maxScore = Math.max(...rows.map((row) => row.score))
  const scoreToRelative = (score: number) => {
    if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore === 0) return 0
    return Math.max(0, Math.min(100, 100 * 10 ** (score - maxScore)))
  }

  for (const row of rows) {
    row.relative = scoreToRelative(row.score)
  }

  return {
    seEffect,
    zatBoost,
    rows,
  }
}

export const calculateExponentIncreaseMultipliers = (
  junoGain: LargeNumber | string | number,
  junoExponent: number,
  totalPremiumMultiplier: number,
  deltas: number[] = [0.001, 0.005, 0.01],
): ExponentIncreaseEntry[] => {
  const gain = LargeNumber.from(junoGain)
  const premiumMultiplier = Math.max(totalPremiumMultiplier, Number.EPSILON)

  if (junoExponent <= 0 || gain.isZero()) {
    return deltas.map((delta) => ({ delta, multiplier: 1 }))
  }

  const baseGain = gain.divide(premiumMultiplier)
  const baseLog10 = log10LargeNumber(baseGain)

  if (!Number.isFinite(baseLog10)) {
    return deltas.map((delta) => ({ delta, multiplier: 1 }))
  }

  return deltas.map((delta) => {
    const clampedDelta = Math.max(0, delta)
    const ratioLog10 = (baseLog10 * clampedDelta) / junoExponent
    const multiplier = 10 ** ratioLog10

    return {
      delta: clampedDelta,
      multiplier,
    }
  })
}

export const calculateTotalPremiumMultiplier = (purchases: PremiumInput): number => {
  let multiplier = 1
  let tokenExtra = 0
  let tokenMultiplier = 1

  for (const rule of premiumRules) {
    const amount = resolvePurchaseAmount(rule, purchases)

    let level = amount
    if (rule.min !== undefined || rule.max !== undefined) {
      const min = rule.min ?? 0
      const max = rule.max ?? Number.POSITIVE_INFINITY
      level = clamp(amount, min, max) - min
    }

    level = Math.max(0, level)

    const isTokenRule = normalizeKey(rule.name).includes("token")

    if (isTokenRule) {
      if (rule.mode === "add") {
        tokenExtra += level * rule.value
        continue
      }

      if (rule.mode === "mul") {
        // Token multipliers apply to token bonus only, not to the baseline 1x.
        tokenMultiplier *= (1 + rule.value) ** level
        continue
      }
    }

    if (rule.mode === "add") {
      // Additive-with-self sources (for example Juno Output or linear tokens)
      // contribute their own factor and still multiply with other sources.
      multiplier *= 1 + level * rule.value
      continue
    }

    if (rule.mode === "mul") {
      multiplier *= (1 + rule.value) ** level
      continue
    }
  }

  if (tokenExtra > 0) {
    multiplier *= 1 + tokenExtra * tokenMultiplier
  }

  return multiplier
}

export const calculateNextZatCost = (amount: LargeNumber): NextZatCostResult => {
  let cost = 0
  let exponent = 0
  let cycle = 1
  for (; cycle < 10_000; cycle += 1) {
    exponent += cycleMultiplierIncreases.get(cycle) ?? 0
    cost += exponent
    if (amount.exponent < cost) break
  }

  return { cycle, cost: largeFromPow10(cost) }
}
