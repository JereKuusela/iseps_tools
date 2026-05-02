import cyclesJson from "../../data/cycles.json"
import premiumJson from "../../data/juno_premium.json"
import techsSeEffectJson from "../../data/techs_se_effect.json"
import techsJson from "../../data/techs.json"
import { LargeNumber } from "./largeNumber"

export type ZatMode = "juno" | "dc"

type CycleRule = {
  cycle: number
  mult: number
}

type SeEffectRule = {
  kind: "mul" | "div"
  se: number
  value: number
}

type TechCurveRule = {
  level: number
  mult: string
}

type TechData = {
  id: number
  initCost: string
  costCurve: TechCurveRule[]
  dcBoost?: number
  junoBase?: number
  extraJunoBase?: number
  extraJunoExp?: number
  seMultiplier?: number
  seAdditive?: number
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

const seRules: SeEffectRule[] = (techsSeEffectJson as SeEffectRule[]).slice().sort((a, b) => a.se - b.se)

const techs: TechData[] = (techsJson as TechData[]).slice().sort((a, b) => a.id - b.id)

const premiumRules: PremiumRule[] = premiumJson as PremiumRule[]

export type TechCostEntry = {
  level: number
  cost: LargeNumber
}

export type TechBoostResult = {
  rawTechBoost: number
  finalBoost: number
}

export type PremiumInput = Record<string, number | boolean | undefined>

export type PremiumSummary = {
  additive: number
  multiplicative: number
  multiplier: number
  exponentAdd: number
}

export type ExponentIncreaseEntry = {
  delta: number
  multiplier: number
}

export type NextZatCostResult = {
  nextCycle: number
  exponent: number
  cost: LargeNumber
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

const getActiveCycleMultiplier = (cycle: number) => {
  let multiplier = 5
  for (const rule of cycleRules) {
    if (rule.cycle > cycle) break
    multiplier = rule.mult
  }
  return multiplier
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

export const calculateZatBoostPerTech = (cycles: number, mode: ZatMode) => {
  const totalCycles = Math.max(0, Math.floor(cycles))
  const cycleMultiplier = getActiveCycleMultiplier(totalCycles)

  const junoBoost = (1 + cycleMultiplier * 0.01) ** totalCycles
  if (mode === "juno") return junoBoost

  return junoBoost ** 1.48
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

export const calculateNextThreeTechCosts = (id: number, currentLevel: number): TechCostEntry[] => {
  const tech = getTechById(id)
  const startingLevel = Math.max(0, Math.floor(currentLevel))

  const sortedCurve = tech.costCurve
    .slice()
    .sort((a, b) => a.level - b.level)
    .map((entry) => ({
      level: entry.level,
      mult: LargeNumber.parse(entry.mult),
    }))

  const targetLevel = startingLevel + 3

  let cost = LargeNumber.parse(tech.initCost)
  let growth = new LargeNumber(1, 0)
  let curveIndex = 0

  const nextCosts: TechCostEntry[] = []

  for (let level = 1; level <= targetLevel; level += 1) {
    while (curveIndex < sortedCurve.length && sortedCurve[curveIndex].level === level) {
      growth = growth.multiply(sortedCurve[curveIndex].mult)
      curveIndex += 1
    }

    cost = cost.multiply(growth)

    if (level > startingLevel) {
      nextCosts.push({
        level,
        cost,
      })
    }
  }

  return nextCosts
}

export const calculateTechBoost = (zatBoost: number, seEffect: number, id: number, mode: ZatMode): TechBoostResult => {
  const tech = getTechById(id)
  const effectiveZatBoost = Math.max(zatBoost, Number.EPSILON)

  let rawTechBoost = 1

  if (mode === "dc") {
    rawTechBoost = tech.dcBoost ?? 1
  } else {
    const base = tech.junoBase ?? 1
    if (base === 1) {
      rawTechBoost = 1
    } else {
      const seMultiplier = tech.seMultiplier ?? 0
      const seAdditive = tech.seAdditive ?? 1
      const exponent = seAdditive + seMultiplier * Math.max(0, seEffect)

      rawTechBoost = base ** exponent

      if (id === 2 && tech.extraJunoBase && tech.extraJunoExp) {
        rawTechBoost *= tech.extraJunoBase ** tech.extraJunoExp
      }
    }
  }

  const finalBoost = Math.log(effectiveZatBoost * (1 + rawTechBoost))

  return {
    rawTechBoost,
    finalBoost,
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

export const calculateTotalPremiumMultiplier = (purchases: PremiumInput): PremiumSummary => {
  let additive = 0
  let multiplicative = 1
  let exponentAdd = 0

  for (const rule of premiumRules) {
    const amount = resolvePurchaseAmount(rule, purchases)

    let level = amount
    if (rule.min !== undefined || rule.max !== undefined) {
      const min = rule.min ?? 0
      const max = rule.max ?? Number.POSITIVE_INFINITY
      level = clamp(amount, min, max) - min
    }

    level = Math.max(0, level)

    if (rule.mode === "add") {
      additive += level * rule.value
      continue
    }

    if (rule.mode === "mul") {
      multiplicative *= rule.value ** level
      continue
    }

    exponentAdd += level * rule.value
  }

  return {
    additive,
    multiplicative,
    multiplier: (1 + additive) * multiplicative,
    exponentAdd,
  }
}

const calculateZatCostExponent = (cycle: number) => {
  const normalizedCycle = Math.max(1, Math.floor(cycle))
  let exponent = 5

  for (let index = 2; index <= normalizedCycle; index += 1) {
    const cycleMultiplier = getActiveCycleMultiplier(index)
    exponent *= 2 * (cycleMultiplier / 5)
  }

  return exponent
}

const getZatCostForCycle = (cycle: number): LargeNumber => {
  return largeFromPow10(calculateZatCostExponent(cycle))
}

export const calculateNextZatCost = (junoAmount: LargeNumber | string | number): NextZatCostResult => {
  const amount = LargeNumber.from(junoAmount)
  let cycle = 1

  while (cycle < 10_000) {
    const cost = getZatCostForCycle(cycle)
    if (amount.compare(cost) < 0) {
      return {
        nextCycle: cycle,
        exponent: calculateZatCostExponent(cycle),
        cost,
      }
    }
    cycle += 1
  }

  const fallbackCycle = 10_000
  return {
    nextCycle: fallbackCycle,
    exponent: calculateZatCostExponent(fallbackCycle),
    cost: getZatCostForCycle(fallbackCycle),
  }
}
