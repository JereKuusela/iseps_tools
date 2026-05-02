import scJson from "../../data/sc.json"
import { LargeNumber } from "./largeNumber"

export type ScGoalType = "battery1" | "battery2" | "battery3" | "customSc" | "customDc"

type DcReplicatorRule = {
  se: number
  base: number
  linear: number
  quadratic: number
}

type SeReplicatorRule = {
  se: number
  perStep: number
  cap: number
}

type DailyBoostRule = {
  se: number
  dailyMultiplier: number
}

type BatteryGoalMultiplierRule = {
  se: number
  mult: string
}

type ScData = {
  replicators: {
    dc: {
      unlockMinutes: number
      rules: DcReplicatorRule[]
    }
    se: {
      stepMinutes: number
      rules: SeReplicatorRule[]
    }
  }
  dailyBoost: DailyBoostRule[]
  batteryGoalMultipliers: BatteryGoalMultiplierRule[]
}

const scData = scJson as ScData

const TIME_SKIP_MINUTES = {
  small: 3,
  medium: 5,
  large: 12,
} as const

const dcReplicatorRules = scData.replicators.dc.rules.slice().sort((a, b) => a.se - b.se)
const seReplicatorRules = scData.replicators.se.rules.slice().sort((a, b) => a.se - b.se)
const dailyBoostRules = scData.dailyBoost.slice().sort((a, b) => a.se - b.se)
const batteryGoalMultiplierRules = scData.batteryGoalMultipliers
  .slice()
  .sort((a, b) => a.se - b.se)
  .map((entry) => ({
    se: entry.se,
    mult: LargeNumber.parse(entry.mult),
  }))

export type DcGoalResult = {
  goalType: ScGoalType
  goalSe: number
  targetSc: LargeNumber | null
  dcCost: LargeNumber
  batteryMultiplier: LargeNumber
}

export type CustomScIterationResult = {
  dcGoal: LargeNumber
  iterations: number
  converged: boolean
}

export type TimeSkipInput = {
  small: number
  medium: number
  large: number
}

export type TimeToGoalInput = {
  currentSe: number
  goalDc: LargeNumber | string | number
  currentDc: LargeNumber | string | number
  dcGainPerMinute: LargeNumber | string | number
  minutesInSe: number
  retainedDcReplicator?: number
  retainedSeReplicator?: number
  futureDcBoostPct?: number
  futureScBoostPct?: number
  timeSkips?: TimeSkipInput
  customDcGoal?: boolean
}

export type TimeToGoalResult = {
  minutes: number
  iterations: number
  converged: boolean
  projectedDcReplicator: number
  projectedScReplicator: number
  projectedDailyMultiplier: number
  effectiveGoalDc: LargeNumber
  effectiveCurrentDc: LargeNumber
  effectiveDcGainPerMinute: LargeNumber
}

function clampMin(value: number, min: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, value)
}

function toSafePositiveNumber(value: number, fallback = 0): number {
  if (!Number.isFinite(value) || value < 0) return fallback
  return value
}

function activeRuleBySe<T extends { se: number }>(rules: T[], se: number): T {
  let active = rules[0]

  for (const rule of rules) {
    if (rule.se > se) break
    active = rule
  }

  return active
}

function activeDailyMultiplier(se: number): number {
  return activeRuleBySe(dailyBoostRules, se).dailyMultiplier
}

function log10LargeNumber(value: LargeNumber): number {
  if (value.isZero()) return Number.NEGATIVE_INFINITY
  return Math.log10(Math.abs(value.mantissa)) + value.exponent
}

function fromLog10(log10Value: number): LargeNumber {
  if (!Number.isFinite(log10Value)) return LargeNumber.zero()

  const exponent = Math.floor(log10Value)
  const mantissa = 10 ** (log10Value - exponent)
  return new LargeNumber(mantissa, exponent)
}

function toFiniteNumber(value: LargeNumber): number {
  if (value.isZero()) return 0
  if (value.exponent > 307) return Number.POSITIVE_INFINITY
  if (value.exponent < -307) return 0
  return value.mantissa * 10 ** value.exponent
}

function safeLog10(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return Number.NEGATIVE_INFINITY
  return Math.log10(value)
}

function retainedDelta(retained: number | undefined): number {
  const safeRetained = toSafePositiveNumber(retained ?? 1, 1)
  return Math.max(0, safeRetained - 1)
}

function scExponentForSe(se: number, branchSe = se): number {
  const safeSe = Math.max(0, se)

  if (branchSe < 100) {
    return 0.1754 - (safeSe ** 2.13 * 3) / 1e6
  }

  return 1 / (0.1754 + safeSe ** 1.25 * 0.026)
}

function calculateScLog10FromDcLog10(
  dcLog10: number,
  seForExponent: number,
  scMultiplier: number,
  branchSe: number,
): number {
  const exponent = scExponentForSe(seForExponent, branchSe)
  const baseMultiplierLog10 = Math.log10(Math.max(scMultiplier, Number.EPSILON))
  return baseMultiplierLog10 + exponent * (dcLog10 - 14)
}

function calculateScFromDc(
  dc: LargeNumber,
  seForExponent: number,
  scMultiplier: number,
  branchSe: number,
): LargeNumber {
  const dcLog10 = log10LargeNumber(dc)
  const scLog10 = calculateScLog10FromDcLog10(dcLog10, seForExponent, scMultiplier, branchSe)
  return fromLog10(scLog10)
}

function calculateDcFromSc(
  targetSc: LargeNumber,
  seForExponent: number,
  scMultiplier: number,
  branchSe: number,
): LargeNumber {
  const targetScLog10 = log10LargeNumber(targetSc)
  const exponent = scExponentForSe(seForExponent, branchSe)
  const baseMultiplierLog10 = Math.log10(Math.max(scMultiplier, Number.EPSILON))

  const dcLog10 = 14 + (targetScLog10 - baseMultiplierLog10) / Math.max(exponent, Number.EPSILON)
  return fromLog10(dcLog10)
}

function cumulativeBatteryGoalMultiplier(goalSe: number): LargeNumber {
  let multiplier = new LargeNumber(1, 0)

  for (const rule of batteryGoalMultiplierRules) {
    if (rule.se > goalSe) break
    multiplier = multiplier.multiply(rule.mult)
  }

  return multiplier
}

function calculateDcReplicator(se: number, minutesInSe: number, retained: number): number {
  const unlockMinutes = scData.replicators.dc.unlockMinutes
  if (minutesInSe < unlockMinutes) {
    return 1 + retainedDelta(retained)
  }

  const rule = activeRuleBySe(dcReplicatorRules, se)
  const x = Math.max(0, minutesInSe)
  const base = rule.base + rule.linear * x + rule.quadratic * x * x
  return base + retainedDelta(retained)
}

function calculateSeReplicator(se: number, minutesInSe: number, retained: number): number {
  const rule = activeRuleBySe(seReplicatorRules, se)
  const stepMinutes = Math.max(1, scData.replicators.se.stepMinutes)
  const base = rule.perStep * Math.floor(Math.max(0, minutesInSe) / stepMinutes)
  const total = 1 + base + retainedDelta(retained)
  return Math.min(rule.cap, total)
}

function applyTimeSkips(currentDc: LargeNumber, dcGainPerMinute: LargeNumber, skips?: TimeSkipInput): LargeNumber {
  if (!skips) return currentDc

  const small = Math.max(0, Math.floor(skips.small))
  const medium = Math.max(0, Math.floor(skips.medium))
  const large = Math.max(0, Math.floor(skips.large))
  const totalMinutes =
    small * TIME_SKIP_MINUTES.small + medium * TIME_SKIP_MINUTES.medium + large * TIME_SKIP_MINUTES.large

  if (totalMinutes <= 0) return currentDc

  return currentDc.add(dcGainPerMinute.multiply(totalMinutes))
}

function directMinutesToGoal(goal: LargeNumber, current: LargeNumber, gainPerMinute: LargeNumber): number {
  if (current.compare(goal) >= 0) return 0
  if (gainPerMinute.isZero() || gainPerMinute.compare(0) <= 0) return Number.POSITIVE_INFINITY

  const remaining = goal.subtract(current)
  const minutes = remaining.divide(gainPerMinute)
  return toFiniteNumber(minutes)
}

function logarithmicMean(minGuess: number, maxGuess: number): number {
  const minLn = Math.log(Math.max(1, minGuess))
  const maxLn = Math.log(Math.max(1, maxGuess))

  const denominator = maxLn - minLn
  if (Math.abs(denominator) < Number.EPSILON) {
    return (minGuess + maxGuess) / 2
  }

  const guess = (maxGuess - minGuess) / denominator
  if (!Number.isFinite(guess) || guess < minGuess || guess > maxGuess) {
    return (minGuess + maxGuess) / 2
  }

  return guess
}

export function calculateDcCostOfGoal(input: {
  currentSe: number
  goalType: ScGoalType
  customScGoal?: LargeNumber | string | number
  customDcGoal?: LargeNumber | string | number
  scMultiplier?: number
}): DcGoalResult {
  const currentSe = Math.max(0, Math.floor(input.currentSe))
  const scMultiplier = Math.max(input.scMultiplier ?? 1, Number.EPSILON)

  if (input.goalType === "customDc") {
    return {
      goalType: input.goalType,
      goalSe: currentSe,
      targetSc: null,
      dcCost: LargeNumber.from(input.customDcGoal ?? 0),
      batteryMultiplier: new LargeNumber(1, 0),
    }
  }

  if (input.goalType === "customSc") {
    const targetSc = LargeNumber.from(input.customScGoal ?? 0)
    const custom = iterateCustomScGoalDcCost({
      currentSe,
      targetSc,
      scMultiplier,
    })

    return {
      goalType: input.goalType,
      goalSe: currentSe,
      targetSc,
      dcCost: custom.dcGoal,
      batteryMultiplier: new LargeNumber(1, 0),
    }
  }

  const goalSeOffset = input.goalType === "battery2" ? 1 : input.goalType === "battery3" ? 2 : 0
  const goalSe = currentSe + goalSeOffset

  const targetSc = fromLog10(goalSe)
  const baseCost = calculateDcFromSc(targetSc, goalSe, scMultiplier, goalSe)
  const multiplier = cumulativeBatteryGoalMultiplier(goalSe)

  return {
    goalType: input.goalType,
    goalSe,
    targetSc,
    dcCost: baseCost.multiply(multiplier),
    batteryMultiplier: multiplier,
  }
}

export function iterateCustomScGoalDcCost(input: {
  currentSe: number
  targetSc: LargeNumber | string | number
  scMultiplier?: number
  toleranceRatio?: number
  maxIterations?: number
}): CustomScIterationResult {
  const currentSe = Math.max(0, Math.floor(input.currentSe))
  const targetSc = LargeNumber.from(input.targetSc)
  const targetScLog10 = log10LargeNumber(targetSc)

  if (!Number.isFinite(targetScLog10)) {
    return {
      dcGoal: LargeNumber.zero(),
      iterations: 0,
      converged: true,
    }
  }

  const scMultiplier = Math.max(input.scMultiplier ?? 1, Number.EPSILON)
  const toleranceRatio = clampMin(input.toleranceRatio ?? 0.001, 1e-9)
  const toleranceLog10 = Math.log10(1 + toleranceRatio)
  const maxIterations = Math.max(1, Math.floor(input.maxIterations ?? 150))

  const initialEstimateDc = calculateDcFromSc(targetSc, currentSe, scMultiplier, currentSe)
  const initialEstimateLog10 = log10LargeNumber(initialEstimateDc)

  let minDcLog10 = Math.max(0, initialEstimateLog10 - 2)
  let maxDcLog10: number | null = null

  let guessDcLog10 = Math.max(minDcLog10, initialEstimateLog10)
  let iterations = 0

  const calculateProjectedScLog10 = (dcLog10: number): number => {
    const rawScLog10 = calculateScLog10FromDcLog10(dcLog10, currentSe, scMultiplier, currentSe)
    const revisedSe = Math.max(currentSe, (rawScLog10 + currentSe) / 2)
    return calculateScLog10FromDcLog10(dcLog10, revisedSe, scMultiplier, currentSe)
  }

  while (iterations < maxIterations) {
    iterations += 1

    const projectedScLog10 = calculateProjectedScLog10(guessDcLog10)
    const deltaLog10 = projectedScLog10 - targetScLog10

    if (Math.abs(deltaLog10) <= toleranceLog10) {
      return {
        dcGoal: fromLog10(guessDcLog10),
        iterations,
        converged: true,
      }
    }

    if (projectedScLog10 < targetScLog10) {
      minDcLog10 = guessDcLog10

      if (maxDcLog10 === null) {
        guessDcLog10 += 1
      } else {
        guessDcLog10 = (minDcLog10 + maxDcLog10) / 2
      }
      continue
    }

    maxDcLog10 = guessDcLog10
    guessDcLog10 = (minDcLog10 + maxDcLog10) / 2
  }

  return {
    dcGoal: fromLog10(guessDcLog10),
    iterations,
    converged: false,
  }
}

export function iterateTimeToReachGoal(input: TimeToGoalInput): TimeToGoalResult {
  const currentSe = Math.max(0, Math.floor(input.currentSe))
  const goalDc = LargeNumber.from(input.goalDc)
  const currentDc = LargeNumber.from(input.currentDc)
  const dcGainPerMinute = LargeNumber.from(input.dcGainPerMinute)

  const retainedDcReplicator = toSafePositiveNumber(input.retainedDcReplicator ?? 1, 1)
  const retainedSeReplicator = toSafePositiveNumber(input.retainedSeReplicator ?? 1, 1)
  const futureDcBoostMultiplier = 1 + toSafePositiveNumber(input.futureDcBoostPct ?? 0) / 100
  const futureScBoostMultiplier = 1 + toSafePositiveNumber(input.futureScBoostPct ?? 0) / 100
  const minutesInSeBase = toSafePositiveNumber(input.minutesInSe)

  const currentAfterSkips = applyTimeSkips(currentDc, dcGainPerMinute, input.timeSkips)

  const initialMinutes = directMinutesToGoal(goalDc, currentAfterSkips, dcGainPerMinute)
  if (!Number.isFinite(initialMinutes)) {
    return {
      minutes: Number.POSITIVE_INFINITY,
      iterations: 0,
      converged: false,
      projectedDcReplicator: calculateDcReplicator(currentSe, minutesInSeBase, retainedDcReplicator),
      projectedScReplicator: calculateSeReplicator(currentSe, minutesInSeBase, retainedSeReplicator),
      projectedDailyMultiplier: 1,
      effectiveGoalDc: goalDc,
      effectiveCurrentDc: currentAfterSkips,
      effectiveDcGainPerMinute: dcGainPerMinute,
    }
  }

  let minGuess = 0
  let maxGuess = Math.max(1, initialMinutes)

  let iterations = 0
  const maxIterations = 150

  let converged = false
  let finalMinutes = maxGuess

  let projectedDcReplicator = 1
  let projectedScReplicator = 1
  let projectedDailyMultiplier = 1
  let effectiveGoalDc = goalDc
  let effectiveCurrentDc = currentAfterSkips
  let effectiveDcGainPerMinute = dcGainPerMinute

  while (iterations < maxIterations) {
    iterations += 1

    const guess = logarithmicMean(minGuess, maxGuess)
    const projectedMinutesInSe = minutesInSeBase + guess

    projectedDcReplicator = calculateDcReplicator(currentSe, projectedMinutesInSe, retainedDcReplicator)
    projectedScReplicator = calculateSeReplicator(currentSe, projectedMinutesInSe, retainedSeReplicator)
    const dailyMultiplierBase = activeDailyMultiplier(currentSe)
    const dailyLog10 = (guess / 1440) * safeLog10(dailyMultiplierBase)
    projectedDailyMultiplier =
      Number.isFinite(dailyLog10) && dailyLog10 < 308 ? 10 ** dailyLog10 : Number.POSITIVE_INFINITY

    const dcScaleLog10 = safeLog10(projectedDcReplicator) + dailyLog10 + safeLog10(futureDcBoostMultiplier)
    const scScaleLog10 = input.customDcGoal ? 0 : safeLog10(projectedScReplicator) + safeLog10(futureScBoostMultiplier)

    const dcScale = fromLog10(dcScaleLog10)
    const scScale = fromLog10(scScaleLog10)

    effectiveGoalDc = input.customDcGoal ? goalDc : goalDc.divide(scScale)
    effectiveCurrentDc = currentAfterSkips.multiply(dcScale)
    effectiveDcGainPerMinute = dcGainPerMinute.multiply(dcScale)

    const recalculated = directMinutesToGoal(effectiveGoalDc, effectiveCurrentDc, effectiveDcGainPerMinute)

    if (!Number.isFinite(recalculated)) {
      break
    }

    const closeByMinute = Math.abs(recalculated - guess) <= 1
    const closeByRatio = Math.abs(recalculated - guess) <= Math.max(1, guess) * 0.001

    finalMinutes = recalculated

    if (closeByMinute || closeByRatio) {
      converged = true
      break
    }

    if (recalculated > guess) {
      minGuess = guess
      maxGuess = Math.max(maxGuess, recalculated)
    } else {
      maxGuess = guess
    }
  }

  return {
    minutes: Math.max(0, finalMinutes),
    iterations,
    converged,
    projectedDcReplicator,
    projectedScReplicator,
    projectedDailyMultiplier,
    effectiveGoalDc,
    effectiveCurrentDc,
    effectiveDcGainPerMinute,
  }
}

export function calculateProjectedScFromDc(input: {
  currentSe: number
  projectedDc: LargeNumber | string | number
  scMultiplier?: number
}): LargeNumber {
  const currentSe = Math.max(0, Math.floor(input.currentSe))
  const projectedDc = LargeNumber.from(input.projectedDc)
  const scMultiplier = Math.max(input.scMultiplier ?? 1, Number.EPSILON)

  const rawSc = calculateScFromDc(projectedDc, currentSe, scMultiplier, currentSe)
  const rawScLog10 = log10LargeNumber(rawSc)
  const revisedSe = Math.max(currentSe, (rawScLog10 + currentSe) / 2)

  return calculateScFromDc(projectedDc, revisedSe, scMultiplier, currentSe)
}

export function calculateScMultiplierFromBattery1Dc(input: {
  currentSe: number
  battery1DcCost: LargeNumber | string | number
}): number {
  const currentSe = Math.max(0, Math.floor(input.currentSe))
  const battery1DcCost = LargeNumber.from(input.battery1DcCost)
  const battery1DcLog10 = log10LargeNumber(battery1DcCost)
  const batteryMultiplierLog10 = log10LargeNumber(cumulativeBatteryGoalMultiplier(currentSe))

  if (!Number.isFinite(battery1DcLog10) || !Number.isFinite(batteryMultiplierLog10)) return 1

  const exponent = scExponentForSe(currentSe, currentSe)
  if (!Number.isFinite(exponent) || exponent <= 0) return 1

  const targetScLog10 = currentSe
  const baseDcLog10 = battery1DcLog10 - batteryMultiplierLog10
  const multiplierLog10 = targetScLog10 - exponent * (baseDcLog10 - 14)

  if (!Number.isFinite(multiplierLog10)) return 1
  if (multiplierLog10 > 307) return Number.MAX_VALUE
  if (multiplierLog10 < -307) return Number.EPSILON

  const scMultiplier = 10 ** multiplierLog10
  if (!Number.isFinite(scMultiplier) || scMultiplier <= 0) return 1

  return scMultiplier
}
