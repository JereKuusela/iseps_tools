import { createMemo, For, Show } from "solid-js"
import { Panel } from "../components/layout/Panel"
import {
  IntegerField,
  isValidNumberishInput,
  NumberField,
  PercentField,
  sanitizeNumberishInput,
  SelectField,
} from "../components/ui/formControls"
import { SummaryInputModal } from "../components/ui/SummaryInputModal"
import { Tooltip } from "../components/ui/Tooltip"
import {
  calculateGoal,
  calculateScMultiplierFromGoal,
  calculateScFromDc,
  iterateTimeToReachGoal,
  type ScGoalType,
} from "../lib/scCalculator"
import { LargeNumber } from "../lib/largeNumber"
import { useScContext } from "../lib/scContext"
import { formatLocalTimestampFromMinutes, formatTimeDuration, formatTimeDurationFromMinutes } from "../lib/timeFormat"

type PanelOutput = {
  id: number
  goalType: ScGoalType
  goalTypeLabel: string
  customGoal: string
  dcCost: LargeNumber
  progressPct: number
  totalMinutes: number
  remainingMinutes: number
  afterSkipsMinutes: number
  projectedProgressPct: number
  projectedDcCost: LargeNumber
  projectedScGained: LargeNumber
  projectedDailyBoost: number
  projectedScReplicator: number
  projectedDcReplicator: number
}

type GainUnit = "min" | "hour" | "day"

const goalOptions: { value: ScGoalType; label: string }[] = [
  { value: "battery1", label: "Battery 1" },
  { value: "battery2", label: "Battery 2" },
  { value: "battery3", label: "Battery 3" },
  { value: "customSc", label: "Custom SC" },
  { value: "customDc", label: "Custom DC" },
]

const gainUnitOptions: { value: GainUnit; label: string }[] = [
  { value: "min", label: "/min" },
  { value: "hour", label: "/hour" },
  { value: "day", label: "/day" },
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
    <Panel
      title="Singularity Calculator"
      subtitle="Compact singularity planner. Enter your current state and compare timeline, skip-adjusted ETA, and projected replicator effects per goal panel."
    >
      <div class="grid gap-3 xl:grid-cols-[350px_1fr]">
        <aside class="space-y-3 rounded-2xl border border-ink/15 bg-white/70 p-3 dark:border-white/15 dark:bg-[#182538]/75">
          <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
            <div class="grid gap-2">
              <NumberField label="SE" value={sc.currentSe()} onInput={sc.setCurrentSe} min={0} step={1} inline />
              <NumberField label="Battery 1 DC" value={sc.battery1DcCost()} onInput={sc.setBattery1DcCost} inline />
              <NumberField label="Current DC" value={sc.currentDc()} onInput={sc.setCurrentDc} inline />
              <div class="grid grid-cols-[1fr_auto] gap-1">
                <NumberField label="Output" value={sc.dcGainValue()} onInput={sc.setDcGainValue} inline />
                <SelectField
                  label="Unit"
                  value={sc.dcGainUnit()}
                  onChange={(next) => sc.setDcGainUnit(next as GainUnit)}
                  options={gainUnitOptions}
                  inline
                />
              </div>
            </div>
          </div>

          <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
            <h3 class="font-mono text-lg font-black text-ink dark:text-white">Replicators</h3>
            <SummaryInputModal label="Time in SE" value={replicatorDurationLabel()}>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <IntegerField
                  label="D"
                  value={sc.replicatorDays()}
                  onInput={sc.setReplicatorDays}
                  min={0}
                  step={1}
                  inline
                />
                <IntegerField
                  label="H"
                  value={sc.replicatorHours()}
                  onInput={sc.setReplicatorHours}
                  min={0}
                  step={1}
                  inline
                />
                <IntegerField
                  label="M"
                  value={sc.replicatorMinutes()}
                  onInput={sc.setReplicatorMinutes}
                  min={0}
                  step={1}
                  inline
                />
              </div>
            </SummaryInputModal>

            <div class="grid grid-cols-2 gap-2">
              <NumberField
                label="Retained DC"
                value={sc.retainedDcReplicator()}
                onInput={sc.setRetainedDcReplicator}
                min={1}
                step={0.01}
                inline
              />
              <NumberField
                label="Retained SC"
                value={sc.retainedSeReplicator()}
                onInput={sc.setRetainedSeReplicator}
                min={1}
                step={0.01}
                inline
              />
            </div>

            <div class="grid grid-cols-3 gap-1.5 rounded-lg border border-ink/15 bg-white/70 p-1.5 dark:border-white/15 dark:bg-[#243954]/40">
              <div class="rounded-md bg-ink/5 px-2 py-1 text-center dark:bg-white/10">
                <p class="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/65 dark:text-white/70">
                  DC Retain
                </p>
                <p class="font-mono text-sm font-black text-accent dark:text-[#8ce3ff]">
                  {formatMultiplier(retainedDc())}
                </p>
              </div>
              <div class="rounded-md bg-ink/5 px-2 py-1 text-center dark:bg-white/10">
                <p class="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/65 dark:text-white/70">
                  SC Retain
                </p>
                <p class="font-mono text-sm font-black text-accent dark:text-[#8ce3ff]">
                  {formatMultiplier(retainedSc())}
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
            <SummaryInputModal label="Time Skips" value={formatTimeDurationFromMinutes(totalSkipMinutes())}>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <IntegerField
                  label="S"
                  value={sc.timeSkipSmall()}
                  onInput={sc.setTimeSkipSmall}
                  min={0}
                  step={1}
                  inline
                />
                <IntegerField
                  label="M"
                  value={sc.timeSkipMedium()}
                  onInput={sc.setTimeSkipMedium}
                  min={0}
                  step={1}
                  inline
                />
                <IntegerField
                  label="L"
                  value={sc.timeSkipLarge()}
                  onInput={sc.setTimeSkipLarge}
                  min={0}
                  step={1}
                  inline
                />
              </div>
            </SummaryInputModal>

            <SummaryInputModal
              label="Online bonus"
              value={formatMultiplier(onlineBonusMultiplier())}
              tooltipContent="First 10 online hours add 38 skip minutes each hour.<br>Alpha Supplies increases this online bonus by 1% per level."
            >
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div class="grid grid-cols-[auto_1fr] items-center gap-2">
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">
                    Online Hrs
                  </p>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sc.onlineHoursPerDay()}
                    onInput={(event) => {
                      const next = sanitizeNumberishInput(event.currentTarget.value)
                      if (!isValidNumberishInput(next)) return
                      sc.setOnlineHoursPerDay(next)
                    }}
                    class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none ring-brand/40 focus:ring dark:border-white/20 dark:bg-[#1a2638] dark:text-white"
                  />
                </div>
                <NumberField
                  label="Alpha"
                  value={sc.alphaSuppliesLevel()}
                  onInput={sc.setAlphaSuppliesLevel}
                  min={0}
                  step={1}
                  inline
                />
              </div>
            </SummaryInputModal>
          </div>

          <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
            <h3 class="font-mono text-lg font-black text-ink dark:text-white">Future Boosts</h3>
            <div class="grid grid-cols-2 gap-2">
              <PercentField label="DC %" value={sc.futureDcBoostPct()} onInput={sc.setFutureDcBoostPct} inline />
              <PercentField label="SC %" value={sc.futureScBoostPct()} onInput={sc.setFutureScBoostPct} inline />
            </div>
          </div>
        </aside>

        <section class="overflow-x-auto rounded-2xl border border-ink/15 bg-white/75 p-3 dark:border-white/15 dark:bg-[#162235]/80">
          <div class="flex min-w-[560px] items-start gap-2.5">
            <For each={outputs()}>
              {(panel, index) => (
                <article class="w-[260px] shrink-0 rounded-xl border border-ink/15 bg-white/85 p-2 dark:border-white/15 dark:bg-[#1c2c43]">
                  <div class="grid grid-cols-[1fr_auto] gap-2">
                    <select
                      value={panel.goalType}
                      onChange={(event) => sc.setPanelGoal(panel.id, event.currentTarget.value as ScGoalType)}
                      class="rounded border border-ink/20 bg-white px-2 py-1.5 font-mono text-lg font-black text-ink outline-none ring-brand/40 focus:ring dark:border-white/20 dark:bg-[#253a56] dark:text-white"
                    >
                      <For each={goalOptions}>{(option) => <option value={option.value}>{option.label}</option>}</For>
                    </select>
                    <Show when={index() > 0}>
                      <button
                        type="button"
                        onClick={() => sc.removePanel(panel.id)}
                        class="rounded border border-ink/20 bg-white px-2 text-sm font-bold text-ink hover:bg-ink/5 dark:border-white/20 dark:bg-[#233752] dark:text-white dark:hover:bg-[#2f496b]"
                        aria-label="Close panel"
                      >
                        X
                      </button>
                    </Show>
                  </div>

                  <Show when={panel.goalType === "customSc" || panel.goalType === "customDc"}>
                    <div class="mt-2">
                      <NumberField
                        label={panel.goalType === "customSc" ? "Custom SC Goal" : "Custom DC Goal"}
                        value={panel.customGoal}
                        onInput={(next) => sc.setPanelCustomGoal(panel.id, next)}
                        inline
                      />
                    </div>
                  </Show>

                  <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                    <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                      <span>DC Cost</span>
                      <span class="text-accent dark:text-[#8ce3ff]">{formatLargeNumber(panel.dcCost, 2)}</span>
                    </div>
                    <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                      <span>Total Time</span>
                      <span class="text-accent dark:text-[#8ce3ff]">{formatTimeDuration(panel.totalMinutes)}</span>
                    </div>
                    <div class="grid grid-cols-[1fr_auto] px-2 py-1.5 font-mono text-lg font-bold dark:text-white">
                      <span>Progress</span>
                      <span class="text-accent dark:text-[#8ce3ff]">{formatPercent(panel.progressPct, 2)}</span>
                    </div>
                  </div>

                  <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                    <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                      <span>Remaining</span>
                      <span class="text-accent dark:text-[#8ce3ff]">{formatTimeDuration(panel.remainingMinutes)}</span>
                    </div>
                    <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                      <span>End date</span>
                      <span class="text-accent dark:text-[#8ce3ff]">
                        {formatLocalTimestampFromMinutes(panel.remainingMinutes)}
                      </span>
                    </div>
                  </div>

                  <Show when={totalSkipMinutes() > 0}>
                    <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                      <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                        <span>After Skips</span>
                        <span class="text-accent dark:text-[#8ce3ff]">
                          {formatTimeDuration(panel.afterSkipsMinutes)}
                        </span>
                      </div>
                      <div class="px-2 py-1.5 text-center font-mono text-2xl font-black text-accent dark:text-[#8ce3ff]">
                        {formatLocalTimestampFromMinutes(panel.afterSkipsMinutes)}
                      </div>
                    </div>
                  </Show>

                  <div class="mt-2 grid grid-cols-[1fr_24px] gap-2">
                    <div class="rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                      <h4 class="border-b border-ink/15 px-2 py-1.5 text-center font-mono text-lg font-black text-ink dark:border-white/15 dark:text-white">
                        Projected Values
                      </h4>
                      <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                        <span>Progress</span>
                        <span class="text-accent dark:text-[#8ce3ff]">
                          {formatPercent(panel.projectedProgressPct, 0)}
                        </span>
                      </div>
                      <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                        <span>DC Cost</span>
                        <span class="text-accent dark:text-[#8ce3ff]">
                          {formatLargeNumber(panel.projectedDcCost, 1)}
                        </span>
                      </div>
                      <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                        <span>SC Gained</span>
                        <span class="text-accent dark:text-[#8ce3ff]">
                          {formatLargeNumber(panel.projectedScGained, 2)}
                        </span>
                      </div>
                      <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                        <span>Daily Boost</span>
                        <span class="text-accent dark:text-[#8ce3ff]">
                          {formatMultiplier(panel.projectedDailyBoost)}
                        </span>
                      </div>
                      <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                        <span>SC Replic.</span>
                        <span class="text-accent dark:text-[#8ce3ff]">
                          {formatMultiplier(panel.projectedScReplicator)}
                        </span>
                      </div>
                      <div class="grid grid-cols-[1fr_auto] px-2 py-1.5 font-mono text-lg font-bold dark:text-white">
                        <span>DC Replic.</span>
                        <span class="text-accent dark:text-[#8ce3ff]">
                          {formatMultiplier(panel.projectedDcReplicator)}
                        </span>
                      </div>
                    </div>

                    <div class="relative rounded border border-ink/20 bg-ink/10 dark:border-white/15 dark:bg-white/10">
                      <div
                        class="absolute bottom-0 left-0 right-0 rounded-sm bg-gradient-to-t from-accent to-brand"
                        style={{ height: `${panel.projectedProgressPct}%` }}
                      />
                    </div>
                  </div>
                </article>
              )}
            </For>

            <button
              type="button"
              onClick={sc.addPanel}
              class="h-10 rounded border border-ink/20 bg-white px-3 font-mono text-base font-bold text-ink hover:bg-ink/5 dark:border-white/20 dark:bg-[#253a56] dark:text-white dark:hover:bg-[#2f496b]"
            >
              + Panel
            </button>
          </div>
        </section>
      </div>
    </Panel>
  )
}
