import { createMemo } from "solid-js"
import { Panel } from "../components/layout/Panel"
import {
  calculateDcReplicator,
  calculateGoal,
  calculateSeReplicator,
  calculateScMultiplierFromGoal,
  calculateScFromDc,
  iterateTimeToReachGoal,
  type ScGoalType,
} from "../lib/scCalculator"
import { LargeNumber } from "../lib/largeNumber"
import { useScContext } from "../lib/scContext"
import { formatTimeDurationFromMinutes } from "../lib/timeFormat"
import { ScLeftColumn } from "./sc/ScLeftColumn"
import { ScRightColumn } from "./sc/ScRightColumn"
import type { PanelOutput, ScGoalOption } from "./sc/scTypes"

type GainUnit = "min" | "hour" | "day"

const goalOptions: ScGoalOption[] = [
  { value: "battery1", label: "Battery 1" },
  { value: "battery2", label: "Battery 2" },
  { value: "battery3", label: "Battery 3" },
  { value: "customSc", label: "Custom SC" },
  { value: "customDc", label: "Custom DC" },
]

const parsePositive = (value: string) => Math.max(0, parseNumberish(value))

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const parseLargeNumberSafe = (value: string): LargeNumber => {
  const raw = value.trim()
  if (raw === "") return LargeNumber.zero()

  try {
    return LargeNumber.parse(raw)
  } catch {
    return LargeNumber.zero()
  }
}

const formatLargeNumber = (value: LargeNumber, decimals = 2) => {
  if (value.isZero()) return "0"
  return value.toString(decimals)
}

const formatPercent = (value: number, digits = 2) => {
  if (!Number.isFinite(value)) return "0%"
  return `${value.toFixed(digits)}%`
}

const formatMultiplier = (value: number) => {
  if (!Number.isFinite(value)) return "x0"
  if (value >= 100000) return `x${value.toExponential(1).replace("+", "")}`
  if (value >= 10) return `x${value.toFixed(0)}`
  return `x${value.toFixed(2)}`
}

const goalLabel = (goalType: ScGoalType) => {
  return goalOptions.find((option) => option.value === goalType)?.label ?? "Custom"
}

const toGainPerMinute = (rawGain: LargeNumber, unit: GainUnit): LargeNumber => {
  if (unit === "min") return rawGain
  if (unit === "hour") return rawGain.divide(60)
  return rawGain.divide(1440)
}

const progressPercent = (current: LargeNumber, goal: LargeNumber) => {
  if (goal.compare(0) <= 0 || current.compare(goal) >= 0) return 100

  const ratio = current.divide(goal)
  const asNumber = ratio.mantissa * 10 ** ratio.exponent
  return clamp(asNumber * 100, 0, 100)
}

export const ScPage = () => {
  const sc = useScContext()

  const currentSe = createMemo(() => Math.max(0, Math.floor(parseNumberish(sc.currentSe()))))
  const scMultiplier = createMemo(() =>
    calculateScMultiplierFromGoal({
      se: currentSe(),
      dc: parseLargeNumberSafe(sc.battery1DcCost()),
    }),
  )
  const currentDc = createMemo(() => parseLargeNumberSafe(sc.currentDc()))
  const dcGainPerMinute = createMemo(() => toGainPerMinute(parseLargeNumberSafe(sc.dcGainValue()), sc.dcGainUnit()))

  const minutesInSe = createMemo(() => {
    const days = Math.max(0, parseNumberish(sc.replicatorDays()))
    const hours = Math.max(0, parseNumberish(sc.replicatorHours()))
    const minutes = Math.max(0, parseNumberish(sc.replicatorMinutes()))
    return days * 1440 + hours * 60 + minutes
  })

  const retainedDc = createMemo(() => Math.max(1, parseNumberish(sc.retainedDcReplicator())))
  const retainedSc = createMemo(() => Math.max(1, parseNumberish(sc.retainedSeReplicator())))
  const dcReplicatorTotal = createMemo(() => calculateDcReplicator(currentSe(), minutesInSe(), retainedDc()))
  const scReplicatorTotal = createMemo(() => calculateSeReplicator(currentSe(), minutesInSe(), retainedSc()))
  const dcReplicatorTimeBonus = createMemo(() => calculateDcReplicator(currentSe(), minutesInSe(), 0))
  const scReplicatorTimeBonus = createMemo(() => calculateSeReplicator(currentSe(), minutesInSe(), 0))

  const baseSkips = createMemo(() => ({
    small: Math.max(0, Math.floor(parseNumberish(sc.timeSkipSmall()))),
    medium: Math.max(0, Math.floor(parseNumberish(sc.timeSkipMedium()))),
    large: Math.max(0, Math.floor(parseNumberish(sc.timeSkipLarge()))),
  }))

  const totalSkipMinutes = createMemo(() => baseSkips().small * 3 + baseSkips().medium * 5 + baseSkips().large * 12)

  const onlineExtraMinutes = createMemo(() => {
    const onlineHours = clamp(parseNumberish(sc.onlineHoursPerDay()), 0, 24)
    const boostedHours = Math.min(onlineHours, 10)
    const baseExtraPerHour = 38
    const alphaMultiplier = 1 + Math.max(0, parseNumberish(sc.alphaSuppliesLevel())) * 0.01
    return boostedHours * baseExtraPerHour * alphaMultiplier
  })

  const onlineBonusMultiplier = createMemo(() => 1 + onlineExtraMinutes() / 1440)

  const replicatorDurationLabel = createMemo(() => {
    return formatTimeDurationFromMinutes(minutesInSe())
  })

  const outputs = createMemo<PanelOutput[]>(() => {
    const futureDc = 1 + parsePositive(sc.futureDcBoostPct())
    const futureSc = 1 + parsePositive(sc.futureScBoostPct())

    return sc.panels().map((panel) => {
      const isCustomDc = panel.goalType === "customDc"
      const isCustomSc = panel.goalType === "customSc"
      let customGoal: LargeNumber | undefined = undefined
      if (isCustomDc) customGoal = parseLargeNumberSafe(panel.customGoal)
      if (isCustomSc) customGoal = parseLargeNumberSafe(panel.customGoal)

      const goalResult = calculateGoal({
        se: currentSe(),
        type: panel.goalType,
        customGoal: customGoal,
        scMult: scMultiplier(),
      })

      const noSkips = iterateTimeToReachGoal({
        se: currentSe(),
        goalDc: goalResult.dcCost,
        currentDc: currentDc(),
        dcGainPerMinute: dcGainPerMinute(),
        minutesInSe: minutesInSe(),
        retainedDc: retainedDc(),
        retainedSc: retainedSc(),
        futureDc,
        futureSc,
        customDcGoal: isCustomDc,
      })

      const withSkips = iterateTimeToReachGoal({
        se: currentSe(),
        goalDc: goalResult.dcCost,
        currentDc: currentDc(),
        dcGainPerMinute: dcGainPerMinute(),
        minutesInSe: minutesInSe(),
        retainedDc: retainedDc(),
        retainedSc: retainedSc(),
        futureDc,
        futureSc,
        timeSkips: totalSkipMinutes(),
        extraMinutesPerDay: onlineExtraMinutes(),
        customDcGoal: isCustomDc,
      })

      const progressPct = progressPercent(currentDc(), goalResult.dcCost)
      const projectedProgressPct = progressPercent(currentDc(), noSkips.effectiveGoalDc)

      const projectedDc = currentDc().compare(noSkips.effectiveGoalDc) >= 0 ? currentDc() : noSkips.effectiveGoalDc

      return {
        id: panel.id,
        goalType: panel.goalType,
        goalTypeLabel: goalLabel(panel.goalType),
        customGoal: panel.customGoal,
        dcCost: goalResult.dcCost,
        progressPct,
        totalMinutes: noSkips.minutes,
        remainingMinutes: noSkips.minutes,
        afterSkipsMinutes: withSkips.minutes,
        projectedProgressPct,
        projectedDcCost: noSkips.effectiveGoalDc,
        projectedScGained: calculateScFromDc({
          se: currentSe(),
          dc: projectedDc,
          scMult: scMultiplier().multiply(noSkips.scReplicated),
        }),
        projectedDailyBoost: noSkips.dailyMult,
        projectedScReplicator: noSkips.scReplicator,
        projectedDcReplicator: noSkips.dcReplicator,
      }
    })
  })

  return (
    <Panel title="Singularity Calculator" tooltip="sc.panel" width="full">
      <div class="grid gap-3 xl:grid-cols-[350px_max-content]">
        <ScLeftColumn
          replicatorDurationLabel={replicatorDurationLabel()}
          dcReplicatorTotal={dcReplicatorTotal()}
          scReplicatorTotal={scReplicatorTotal()}
          dcReplicatorTimeBonus={dcReplicatorTimeBonus()}
          scReplicatorTimeBonus={scReplicatorTimeBonus()}
          totalSkipMinutes={totalSkipMinutes()}
          onlineBonusMultiplier={onlineBonusMultiplier()}
          formatMultiplier={formatMultiplier}
        />

        <ScRightColumn
          outputs={outputs()}
          totalSkipMinutes={totalSkipMinutes()}
          goalOptions={goalOptions}
          formatLargeNumber={formatLargeNumber}
          formatPercent={formatPercent}
          formatMultiplier={formatMultiplier}
        />
      </div>
    </Panel>
  )
}
