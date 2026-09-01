import { For, Index, Show, createMemo } from "solid-js"
import { MetricRow } from "../../components/layout/contentBlocks"
import { blurOnEnterOrEscape, MetricField } from "../../components/ui/formControls"
import { LargeNumber } from "../../lib/largeNumber"
import { formatCompactMultiplier, formatLargeNumber, formatPercent } from "../../lib/numberFormat"
import {
  calculateGoal,
  calculateScFromDc,
  calculateScMultiplierFromGoal,
  iterateTimeToReachGoal,
  type ScGoalType,
} from "../../lib/scCalculator"
import { useScContext } from "../../lib/scContext"
import { calculateBoostsMultiplier } from "../../lib/boosts"
import { formatLocalTimestampFromMinutes, formatTimeDuration } from "../../lib/timeFormat"
import type { PanelOutput, ScGoalOption } from "./scTypes"

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

export const ScRightColumn = () => {
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
  const totalSkipMinutes = createMemo(() => {
    const small = Math.max(0, Math.floor(parseNumberish(sc.timeSkipSmall())))
    const medium = Math.max(0, Math.floor(parseNumberish(sc.timeSkipMedium())))
    const large = Math.max(0, Math.floor(parseNumberish(sc.timeSkipLarge())))
    return small * 3 + medium * 5 + large * 12
  })

  const onlineExtraMinutes = createMemo(() =>
    calculateBoostsMultiplier(parseNumberish(sc.onlineHoursPerDay()), parseNumberish(sc.alphaSuppliesLevel())),
  )

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
        customGoal,
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
        onlineMultiplier: onlineExtraMinutes(),
        type: panel.goalType,
        customScGoal: isCustomSc ? customGoal : undefined,
      })
      let afterSkipsMinutes = 0
      if (totalSkipMinutes() > 0) {
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
          onlineMultiplier: onlineExtraMinutes(),
          type: panel.goalType,
          customScGoal: isCustomSc ? customGoal : undefined,
        })
        afterSkipsMinutes = withSkips.minutes
      }

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
        totalMinutes: minutesInSe() + noSkips.minutes,
        remainingMinutes: noSkips.minutes,
        afterSkipsMinutes,
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
    <section class="w-full min-w-0 sm:w-max sm:min-w-[560px]">
      <div class="flex w-full min-w-0 flex-col items-stretch gap-2.5 sm:w-max sm:min-w-[560px] sm:flex-row sm:items-start">
        <Index each={outputs()}>
          {(panel, index) => (
            <article class="w-full rounded-xl border border-ink/15 bg-white/85 p-2 sm:w-[260px] sm:shrink-0 dark:border-white/15 dark:bg-[#1c2c43]">
              <div class="grid grid-cols-[1fr_auto] gap-2">
                <select
                  value={panel().goalType}
                  onChange={(event) => sc.setPanelGoal(panel().id, event.currentTarget.value as ScGoalType)}
                  onKeyDown={blurOnEnterOrEscape}
                  class="rounded border border-ink/20 bg-white px-2 py-1.5 font-mono text-lg font-black text-ink outline-none ring-brand/40 focus:ring dark:border-white/20 dark:bg-[#253a56] dark:text-white"
                >
                  <For each={goalOptions}>{(option) => <option value={option.value}>{option.label}</option>}</For>
                </select>
                <Show when={index === 0}>
                  <button
                    type="button"
                    onClick={() => sc.addPanel()}
                    class="rounded border border-ink/20 bg-white px-2 text-sm font-bold text-ink hover:bg-ink/5 dark:border-white/20 dark:bg-[#233752] dark:text-white dark:hover:bg-[#2f496b]"
                    aria-label="Add panel"
                  >
                    ➕
                  </button>
                </Show>
                <Show when={index > 0}>
                  <button
                    type="button"
                    onClick={() => sc.removePanel(panel().id)}
                    class="rounded border border-ink/20 bg-white px-2 text-sm font-bold text-ink hover:bg-ink/5 dark:border-white/20 dark:bg-[#233752] dark:text-white dark:hover:bg-[#2f496b]"
                    aria-label="Close panel"
                  >
                    🗑️
                  </button>
                </Show>
              </div>

              <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                <Show when={panel().goalType === "customSc" || panel().goalType === "customDc"}>
                  <MetricField
                    label={panel().goalType === "customSc" ? "Custom SC" : "Custom DC"}
                    value={panel().customGoal}
                    onInput={(next) => sc.setPanelCustomGoal(panel().id, next)}
                  />
                </Show>
                <Show when={panel().goalType != "customSc" && panel().goalType != "customDc"}>
                  <MetricRow label="DC Cost" value={formatLargeNumber(panel().dcCost, 2)} />
                </Show>
                <MetricRow label="Total Time" value={formatTimeDuration(panel().totalMinutes)} />
                <MetricRow label="Progress" value={formatPercent(panel().progressPct, 2)} withBorder={false} />
              </div>

              <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                <MetricRow label="Remaining" value={formatTimeDuration(panel().remainingMinutes)} />
                <MetricRow label="End date" value={formatLocalTimestampFromMinutes(panel().remainingMinutes)} />
              </div>

              <Show when={totalSkipMinutes() > 0}>
                <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                  <MetricRow label="After Skips" value={formatTimeDuration(panel().afterSkipsMinutes)} />
                  <MetricRow label="End date" value={formatLocalTimestampFromMinutes(panel().afterSkipsMinutes)} />
                </div>
              </Show>

              <div class="mt-2 grid grid-cols-[1fr_24px] gap-2">
                <div class="rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                  <h4 class="border-b border-ink/15 px-2 py-1.5 text-center font-mono text-lg font-black text-ink dark:border-white/15 dark:text-white">
                    Projected Values
                  </h4>
                  <MetricRow label="Progress" value={formatPercent(panel().projectedProgressPct, 0)} />
                  <MetricRow label="DC Cost" value={formatLargeNumber(panel().projectedDcCost, 2)} />
                  <MetricRow label="SC Gained" value={formatLargeNumber(panel().projectedScGained, 2)} />
                  <MetricRow label="Daily Boost" value={formatCompactMultiplier(panel().projectedDailyBoost)} />
                  <MetricRow label="SC Replic." value={formatCompactMultiplier(panel().projectedScReplicator)} />
                  <MetricRow
                    label="DC Replic."
                    value={formatCompactMultiplier(panel().projectedDcReplicator)}
                    withBorder={false}
                  />
                </div>

                <div class="relative rounded border border-ink/20 bg-ink/10 dark:border-white/15 dark:bg-white/10">
                  <div
                    class="absolute bottom-0 left-0 right-0 rounded-sm bg-gradient-to-t from-accent to-brand"
                    style={{ height: `${panel().projectedProgressPct}%` }}
                  />
                </div>
              </div>
            </article>
          )}
        </Index>
      </div>
    </section>
  )
}
