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
  exp: number
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

const dcReplicatorRules = scData.replicators.dc.rules.slice().sort((a, b) => a.se - b.se)
const seReplicatorRules = scData.replicators.se.rules.slice().sort((a, b) => a.se - b.se)
const dailyBoostRules = scData.dailyBoost.slice().sort((a, b) => a.se - b.se)
const batteryGoalMultiplierRules = scData.batteryGoalMultipliers.slice().sort((a, b) => a.se - b.se)

export type GoalResult = {
  type: ScGoalType
  se: number
  targetSc: LargeNumber
  dcCost: LargeNumber
  extraGoal: number
}

export type CustomScIterationResult = {
  dcGoal: LargeNumber
  iterations: number
  converged: boolean
}

export type TimeToGoalInput = {
  se: number
  goalDc: LargeNumber
  currentDc: LargeNumber
  dcGainPerMinute: LargeNumber
  minutesInSe: number
  retainedDc: number
  retainedSc: number
  futureDc: number
  futureSc: number
  timeSkips?: number
  extraMinutesPerDay?: number
  type: ScGoalType
  customScGoal?: LargeNumber
}

export type TimeToGoalResult = {
  minutes: number
  iterations: number
  converged: boolean
  dcReplicator: number
  scReplicator: number
  scReplicated: number
  dailyMult: number
  effectiveGoalDc: LargeNumber
  effectiveCurrentDc: LargeNumber
  effectiveDcGainPerMinute: LargeNumber
}

const clampMin = (value: number, min: number) => {
  return Math.max(min, value)
}

const toSafePositiveNumber = (value: number, fallback = 0) => {
  return value < 0 ? fallback : value
}

const activeRuleBySe = <T extends { se: number }>(rules: T[], se: number) => {
  let active = rules[0]

  for (const rule of rules) {
    if (rule.se > se) break
    active = rule
  }

  return active
}

const activeDailyMultiplier = (se: number) => {
  return activeRuleBySe(dailyBoostRules, se).dailyMultiplier
}

const log10LargeNumber = (value: LargeNumber) => {
  if (value.isZero()) return Number.NEGATIVE_INFINITY
  return Math.log10(Math.abs(value.mantissa)) + value.exponent
}

const fromLog10 = (log10Value: number): LargeNumber => {
  const exponent = Math.floor(log10Value)
  const mantissa = 10 ** (log10Value - exponent)
  return new LargeNumber(mantissa, exponent)
}

const toFiniteNumber = (value: LargeNumber) => {
  if (value.isZero()) return 0
  if (value.exponent > 307) return Number.POSITIVE_INFINITY
  if (value.exponent < -307) return 0
  return value.mantissa * 10 ** value.exponent
}

const safeLog10 = (value: number) => {
  if (value <= 0) return Number.NEGATIVE_INFINITY
  return Math.log10(value)
}

const relativeReplicatorMultiplier = (projected: number, current: number) => {
  if (current <= 0) return projected
  return projected / current
}

const scExponentForSe = (se: number, branchSe = se) => {
  if (branchSe < 100) return 0.1754 - (3 * se ** 2.13) / 1e6
  else return 1 / (0.1754 + 0.026 * se ** 1.25)
}

const scExponentForSeInversed = (se: number, branchSe = se) => {
  if (branchSe < 100) return 1 / (0.1754 - (3 * se ** 2.13) / 1e6)
  else return 0.1754 + 0.026 * se ** 1.25
}

const calculateScLog10FromDcLog10 = (
  dcLog10: number,
  seForExponent: number,
  scMultiplier: LargeNumber,
  branchSe: number,
) => {
  const exponent = scExponentForSe(seForExponent, branchSe)
  const baseMultiplierLog10 = log10LargeNumber(scMultiplier)
  return baseMultiplierLog10 + exponent * (dcLog10 - 14)
}

const scFromDc = (dc: LargeNumber, seForExponent: number, scMultiplier: LargeNumber, branchSe: number): LargeNumber => {
  const dcLog10 = log10LargeNumber(dc)
  const scLog10 = calculateScLog10FromDcLog10(dcLog10, seForExponent, scMultiplier, branchSe)
  return fromLog10(scLog10)
}

const calculateDcFromSc = (
  targetSc: LargeNumber,
  seForExponent: number,
  scMultiplier: LargeNumber,
  branchSe: number,
): LargeNumber => {
  const targetScLog10 = log10LargeNumber(targetSc)
  const exponent = scExponentForSe(seForExponent, branchSe)
  const baseMultiplierLog10 = log10LargeNumber(scMultiplier)

  const dcLog10 = 14 + (targetScLog10 - baseMultiplierLog10) / Math.max(exponent, Number.EPSILON)
  return fromLog10(dcLog10)
}

const extraBatteryGoal = (goalSe: number) =>
  batteryGoalMultiplierRules
    .filter((rule) => rule.se <= goalSe)
    .reduce((acc, rule) => acc + (1 + goalSe - rule.se) * rule.exp, 0)

export const calculateDcReplicator = (se: number, minutesInSe: number, retained: number) => {
  const unlockMinutes = scData.replicators.dc.unlockMinutes
  if (minutesInSe < unlockMinutes) return retained

  const rule = activeRuleBySe(dcReplicatorRules, se)
  const x = Math.max(0, minutesInSe)
  const base = rule.base + rule.linear * x + rule.quadratic * x * x
  return base + retained
}

export const calculateSeReplicator = (se: number, minutesInSe: number, retained: number) => {
  const rule = activeRuleBySe(seReplicatorRules, se)
  const stepMinutes = Math.max(1, scData.replicators.se.stepMinutes)
  const base = rule.perStep * Math.floor(Math.max(0, minutesInSe) / stepMinutes)
  const total = base + retained
  return Math.min(rule.cap, total)
}

const applyTimeSkips = (currentDc: LargeNumber, dcGainPerMinute: LargeNumber, skipMinutes?: number): LargeNumber => {
  const totalMinutes = Math.max(0, Math.floor(skipMinutes ?? 0))
  if (totalMinutes <= 0) return currentDc
  return currentDc.add(dcGainPerMinute.multiply(totalMinutes))
}

const directMinutesToGoal = (goal: LargeNumber, current: LargeNumber, gainPerMinute: LargeNumber) => {
  if (current.compare(goal) >= 0) return 0
  if (gainPerMinute.isZero() || gainPerMinute.compare(0) <= 0) return Number.POSITIVE_INFINITY

  const remaining = goal.subtract(current)
  const minutes = remaining.divide(gainPerMinute)
  return toFiniteNumber(minutes)
}

const logarithmicMean = (minGuess: number, maxGuess: number) => {
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

type GoalInput = {
  se: number
  type: ScGoalType
  customGoal?: LargeNumber
  scMult: LargeNumber
}

export const calculateGoal = ({ se, type, customGoal, scMult }: GoalInput): GoalResult => {
  if (type === "customDc") {
    return { type, se, targetSc: new LargeNumber(0, 0), dcCost: LargeNumber.from(customGoal ?? 0), extraGoal: 0 }
  }

  if (type === "customSc") {
    const targetSc = customGoal ?? new LargeNumber(0, 0)
    const dcCost = findCustomScGoal({ se, targetSc, scMult })

    return { type, se, targetSc, dcCost, extraGoal: 0 }
  }

  const goalSeOffset = type === "battery2" ? 1 : type === "battery3" ? 2 : 0
  const goalSe = se + goalSeOffset

  const targetSc = fromLog10(goalSe)
  const baseCost = calculateDcFromSc(targetSc, goalSe, scMult, goalSe)
  const extraGoal = extraBatteryGoal(goalSe)
  const dcCost = extraGoal > 0 ? baseCost.multiply(new LargeNumber(1, extraGoal)) : baseCost

  return { type, se: goalSe, targetSc, dcCost, extraGoal }
}

type CustomScGoalInput = {
  se: number
  targetSc: LargeNumber
  scMult: LargeNumber
}

const MAX_ITERATIONS = 150
const TOLERANCE = 0.000001
const TOLERANCE_LOG10 = Math.log10(1 + TOLERANCE)
export const findCustomScGoal = ({ se, targetSc, scMult }: CustomScGoalInput): LargeNumber => {
  const targetScLog10 = log10LargeNumber(targetSc)

  const initialEstimateDc = calculateDcFromSc(targetSc, se, scMult, se)
  const initialEstimateLog10 = log10LargeNumber(initialEstimateDc)

  let minDcLog10 = Math.max(0, initialEstimateLog10 - 2)
  let maxDcLog10: number | null = null

  let guessDcLog10 = Math.max(minDcLog10, initialEstimateLog10)
  let iterations = 0

  const calculateProjectedScLog10 = (dcLog10: number) => {
    const rawScLog10 = calculateScLog10FromDcLog10(dcLog10, se, scMult, se)
    const revisedSe = getRevisedSeLog10(se, rawScLog10)
    return calculateScLog10FromDcLog10(dcLog10, revisedSe, scMult, se)
  }

  while (iterations < MAX_ITERATIONS) {
    iterations += 1

    const projectedScLog10 = calculateProjectedScLog10(guessDcLog10)
    const deltaLog10 = projectedScLog10 - targetScLog10

    if (Math.abs(deltaLog10) <= TOLERANCE_LOG10) {
      return fromLog10(guessDcLog10)
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
  console.warn("Failed to find accurate SC goal.")
  return fromLog10(guessDcLog10)
}

export const iterateTimeToReachGoal = (input: TimeToGoalInput): TimeToGoalResult => {
  const currentSe = Math.max(0, Math.floor(input.se))
  const goalDc = LargeNumber.from(input.goalDc)
  const currentDc = LargeNumber.from(input.currentDc)
  const dcGainPerMinute = LargeNumber.from(input.dcGainPerMinute)

  const baselineDcRep = calculateDcReplicator(input.se, input.minutesInSe, input.retainedDc)
  const baselineScRepl = calculateSeReplicator(input.se, input.minutesInSe, input.retainedSc)
  const minutesInSeBase = toSafePositiveNumber(input.minutesInSe)
  let effectiveSe = currentSe
  if (input.customScGoal) effectiveSe = input.customScGoal.exponent

  const dcExponent = scExponentForSeInversed(effectiveSe, currentSe)

  const currentAfterSkips = applyTimeSkips(currentDc, dcGainPerMinute, input.timeSkips)
  const extraMinutesPerDay = Math.max(0, toSafePositiveNumber(input.extraMinutesPerDay ?? 0))
  const extraMinuteMultiplier = 1 + extraMinutesPerDay / 1440

  const preBoostCurrentDc = currentAfterSkips.multiply(input.futureDc)
  const preBoostDcGainPerMinute = dcGainPerMinute.multiply(input.futureDc * extraMinuteMultiplier)

  const futureScScaleLog10 = input.type == "customDc" ? 0 : safeLog10(input.futureSc)
  const preBoostGoalDc =
    input.type == "customDc" || futureScScaleLog10 === 0
      ? goalDc
      : fromLog10(log10LargeNumber(goalDc) - futureScScaleLog10 * dcExponent)

  const initialMinutes = directMinutesToGoal(preBoostGoalDc, preBoostCurrentDc, preBoostDcGainPerMinute)
  if (!Number.isFinite(initialMinutes)) {
    return {
      minutes: Number.POSITIVE_INFINITY,
      iterations: 0,
      converged: false,
      dcReplicator: baselineDcRep,
      scReplicator: baselineScRepl,
      dailyMult: 1,
      effectiveGoalDc: preBoostGoalDc,
      effectiveCurrentDc: preBoostCurrentDc,
      effectiveDcGainPerMinute: preBoostDcGainPerMinute,
      scReplicated: input.futureSc,
    }
  }

  let minGuess = 0
  let maxGuess = initialMinutes

  let iterations = initialMinutes ? 0 : MAX_ITERATIONS

  let converged = initialMinutes == 0

  let projectedDcRepl = baselineDcRep
  let projectedScRepl = baselineScRepl
  let projectedDailyMultiplier = 1
  let effectiveGoalDc = preBoostGoalDc
  let effectiveCurrentDc = preBoostCurrentDc
  let effectiveDcGainPerMinute = preBoostDcGainPerMinute
  let scReplicated = input.futureSc

  while (iterations < MAX_ITERATIONS) {
    iterations += 1

    const guess = logarithmicMean(minGuess, maxGuess)
    const projectedMinutesInSe = minutesInSeBase + guess

    projectedDcRepl = calculateDcReplicator(input.se, projectedMinutesInSe, input.retainedDc)
    projectedScRepl = calculateSeReplicator(input.se, projectedMinutesInSe, input.retainedSc)
    const relativeDcRepl = relativeReplicatorMultiplier(projectedDcRepl, baselineDcRep)
    const relativeScRepl = relativeReplicatorMultiplier(projectedScRepl, baselineScRepl)
    scReplicated = input.futureSc * relativeScRepl
    const dailyMultiplierBase = activeDailyMultiplier(input.se)
    const dailyLog10 = Math.floor(guess / 1440) * safeLog10(dailyMultiplierBase)
    projectedDailyMultiplier =
      Number.isFinite(dailyLog10) && dailyLog10 < 308 ? 10 ** dailyLog10 : Number.POSITIVE_INFINITY

    const dcScaleLog10 = safeLog10(relativeDcRepl) + dailyLog10

    const dcScale = fromLog10(dcScaleLog10)

    if (input.type == "customDc") {
      effectiveGoalDc = preBoostGoalDc
    } else {
      // SC multipliers are multiplicative on SC, but DC required for the same SC target follows the inverse power law.
      effectiveGoalDc = preBoostGoalDc.divide(relativeScRepl ** dcExponent)
    }

    effectiveCurrentDc = preBoostCurrentDc.multiply(dcScale)
    effectiveDcGainPerMinute = preBoostDcGainPerMinute.multiply(dcScale)

    const projectedDcAtGuess = effectiveCurrentDc.add(effectiveDcGainPerMinute.multiply(guess))
    const reachedTarget = projectedDcAtGuess.compare(effectiveGoalDc) >= 0

    if (reachedTarget) maxGuess = guess
    else minGuess = guess

    if (maxGuess - minGuess < 1) {
      converged = true
      break
    }
  }

  return {
    minutes: Math.max(0, Math.ceil(maxGuess)),
    iterations,
    converged,
    dcReplicator: projectedDcRepl,
    scReplicator: projectedScRepl,
    dailyMult: projectedDailyMultiplier,
    effectiveGoalDc,
    effectiveCurrentDc,
    effectiveDcGainPerMinute,
    scReplicated,
  }
}

type ScFromDcInput = {
  se: number
  dc: LargeNumber
  scMult: LargeNumber
}
export const calculateScFromDc = ({ se, dc, scMult }: ScFromDcInput) => {
  const rawSc = scFromDc(dc, se, scMult, se)
  const rawScLog10 = log10LargeNumber(rawSc)
  const revisedSe = Math.max(se, (rawScLog10 + se) / 2)
  return scFromDc(dc, revisedSe, scMult, se)
}

type ScMultFromGoalInput = {
  se: number
  dc: LargeNumber
}
export const calculateScMultiplierFromGoal = ({ se, dc }: ScMultFromGoalInput) => {
  const battery1DcCost = dc
  const battery1DcLog10 = log10LargeNumber(battery1DcCost)
  const extraGoal = extraBatteryGoal(se)
  const exponent = scExponentForSe(se)
  const targetScLog10 = se
  const baseDcLog10 = battery1DcLog10 - extraGoal - 14
  const multiplierLog10 = targetScLog10 - exponent * baseDcLog10
  const exp = Math.floor(multiplierLog10)
  const mantissa = 10 ** (multiplierLog10 - exp)
  return new LargeNumber(mantissa, exp)
}

const getRevisedSe = (se: number, sc: LargeNumber) => {
  const scLog10 = log10LargeNumber(sc)
  return Math.max(se, (scLog10 + se) / 2)
}

const getRevisedSeLog10 = (se: number, scLog10: number) => {
  return Math.max(se, (scLog10 + se) / 2)
}
