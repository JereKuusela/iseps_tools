import { createMemo, For, Show } from "solid-js"
import { Panel } from "../components/layout/Panel"
import { isValidNumberishInput, NumberField, sanitizeNumberishInput, SelectField } from "../components/ui/formControls"
import { Tooltip } from "../components/ui/Tooltip"
import {
  calculateDcCostOfGoal,
  calculateScMultiplierFromBattery1Dc,
  calculateProjectedScFromDc,
  iterateTimeToReachGoal,
  type ScGoalType,
} from "../lib/scCalculator"
import { LargeNumber } from "../lib/largeNumber"
import { useScContext } from "../lib/scContext"

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

const timezoneOptions = [
  { value: "local", label: "Local" },
  ...Array.from({ length: 27 }, (_, index) => {
    const offset = index - 12
    const sign = offset >= 0 ? "+" : ""
    return { value: String(offset), label: `UTC ${sign}${offset}` }
  }),
]

function parseNumberish(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function parseLargeNumberSafe(value: string): LargeNumber {
  const raw = value.trim()
  if (raw === "") return LargeNumber.zero()

  try {
    return LargeNumber.parse(raw)
  } catch {
    return LargeNumber.zero()
  }
}

function formatLargeNumber(value: LargeNumber, decimals = 2): string {
  if (value.isZero()) return "0"
  return value.toString(decimals)
}

function formatPercent(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "0%"
  return `${value.toFixed(digits)}%`
}

function formatMultiplier(value: number): string {
  if (!Number.isFinite(value)) return "x0"
  return `x${value.toFixed(2)}`
}

function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes)) return "> 10 years"
  if (minutes <= 0.5) return "0.0 mins"
  if (minutes < 120) return `${minutes.toFixed(1)} mins`

  const hours = minutes / 60
  if (hours < 72) return `${hours.toFixed(1)} hours`

  const days = hours / 24
  return `${days.toFixed(1)} days`
}

function formatTimestampFromMinutes(minutes: number, timezone: string): string {
  if (!Number.isFinite(minutes)) return "Unknown"

  const baseDate = new Date(Date.now() + minutes * 60 * 1000)
  const pad = (value: number) => String(value).padStart(2, "0")

  if (timezone === "local") {
    return `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())} ${pad(baseDate.getHours())}:${pad(baseDate.getMinutes())}`
  }

  const offset = Math.trunc(parseNumberish(timezone))
  const shifted = new Date(baseDate.getTime() + offset * 60 * 60 * 1000)
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
}

function goalLabel(goalType: ScGoalType): string {
  return goalOptions.find((option) => option.value === goalType)?.label ?? "Custom"
}

function toGainPerMinute(rawGain: LargeNumber, unit: GainUnit): LargeNumber {
  if (unit === "min") return rawGain
  if (unit === "hour") return rawGain.divide(60)
  return rawGain.divide(1440)
}

function progressPercent(current: LargeNumber, goal: LargeNumber): number {
  if (goal.compare(0) <= 0 || current.compare(goal) >= 0) return 100

  const ratio = current.divide(goal)
  const asNumber = ratio.mantissa * 10 ** ratio.exponent
  return clamp(asNumber * 100, 0, 100)
}

export function ScPage() {
  const sc = useScContext()

  const currentSe = createMemo(() => Math.max(0, Math.floor(parseNumberish(sc.currentSe()))))
  const scMultiplier = createMemo(() =>
    calculateScMultiplierFromBattery1Dc({
      currentSe: currentSe(),
      battery1DcCost: parseLargeNumberSafe(sc.battery1DcCost()),
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

  const onlineExtraMinutes = createMemo(() => {
    const onlineHours = clamp(parseNumberish(sc.onlineHoursPerDay()), 0, 24)
    const boostedHours = Math.min(onlineHours, 10)
    const baseExtraPerHour = 38
    const alphaMultiplier = 1 + Math.max(0, parseNumberish(sc.alphaSuppliesLevel())) * 0.01
    return boostedHours * baseExtraPerHour * alphaMultiplier
  })

  const skipsWithOnline = createMemo(() => {
    const smallFromOnline = Math.floor(onlineExtraMinutes() / 3)
    return {
      small: baseSkips().small + smallFromOnline,
      medium: baseSkips().medium,
      large: baseSkips().large,
    }
  })

  const totalSkipMinutes = createMemo(() => {
    const skips = skipsWithOnline()
    return skips.small * 3 + skips.medium * 5 + skips.large * 12
  })

  const outputs = createMemo<PanelOutput[]>(() => {
    return sc.panels().map((panel) => {
      const isCustomDc = panel.goalType === "customDc"
      const goalInput = panel.goalType === "customSc" ? panel.customGoal : undefined
      const customDcInput = isCustomDc ? panel.customGoal : undefined

      const goalResult = calculateDcCostOfGoal({
        currentSe: currentSe(),
        goalType: panel.goalType,
        customScGoal: goalInput,
        customDcGoal: customDcInput,
        scMultiplier: scMultiplier(),
      })

      const noSkips = iterateTimeToReachGoal({
        currentSe: currentSe(),
        goalDc: goalResult.dcCost,
        currentDc: currentDc(),
        dcGainPerMinute: dcGainPerMinute(),
        minutesInSe: minutesInSe(),
        retainedDcReplicator: retainedDc(),
        retainedSeReplicator: retainedSc(),
        futureDcBoostPct: Math.max(0, parseNumberish(sc.futureDcBoostPct())),
        futureScBoostPct: Math.max(0, parseNumberish(sc.futureScBoostPct())),
        customDcGoal: isCustomDc,
      })

      const withSkips = iterateTimeToReachGoal({
        currentSe: currentSe(),
        goalDc: goalResult.dcCost,
        currentDc: currentDc(),
        dcGainPerMinute: dcGainPerMinute(),
        minutesInSe: minutesInSe(),
        retainedDcReplicator: retainedDc(),
        retainedSeReplicator: retainedSc(),
        futureDcBoostPct: Math.max(0, parseNumberish(sc.futureDcBoostPct())),
        futureScBoostPct: Math.max(0, parseNumberish(sc.futureScBoostPct())),
        timeSkips: skipsWithOnline(),
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
        projectedScGained: calculateProjectedScFromDc({
          currentSe: currentSe(),
          projectedDc,
          scMultiplier: scMultiplier(),
        }),
        projectedDailyBoost: noSkips.projectedDailyMultiplier,
        projectedScReplicator: noSkips.projectedScReplicator,
        projectedDcReplicator: noSkips.projectedDcReplicator,
      }
    })
  })

  return (
    <Panel title="SC" subtitle="Singularity calculator with projected timelines, skips, and replicator outcomes.">
      <div class="grid gap-4 xl:grid-cols-[390px_1fr]">
        <aside class="space-y-3 rounded-2xl border border-ink/15 bg-white/70 p-3 dark:border-white/15 dark:bg-[#182538]/75">
          <h2 class="rounded-md border border-ink/20 bg-white/90 px-3 py-2 text-center font-mono text-3xl font-black tracking-wide text-ink dark:border-white/20 dark:bg-[#21324a] dark:text-white">
            Singularity Calculator
          </h2>
          <p class="rounded-sm border border-ink/20 bg-white/80 px-3 py-0.5 text-center font-mono text-xs font-bold text-ink/80 dark:border-white/20 dark:bg-[#22344d] dark:text-white/80">
            Please make a copy to use this calculator
          </p>

          <div class="grid gap-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
            <div class="grid grid-cols-[auto_1fr_auto_1fr] overflow-hidden rounded border border-ink/20 dark:border-white/15">
              <span class="bg-ink px-2 py-1 font-mono text-xl font-bold text-white dark:bg-[#223753]">Setup</span>
              <NumberField label="SE" value={sc.currentSe()} onInput={sc.setCurrentSe} min={0} step={1} />
              <span class="bg-ink/75 px-2 py-1 font-mono text-xl font-bold text-white dark:bg-[#2a3d58]">UTC</span>
              <SelectField
                label="Time Zone"
                value={sc.timezone()}
                onChange={sc.setTimezone}
                options={timezoneOptions}
              />
            </div>
          </div>

          <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
            <div class="grid gap-2">
              <NumberField label="Battery 1 DC" value={sc.battery1DcCost()} onInput={sc.setBattery1DcCost} />
              <NumberField label="Current DC" value={sc.currentDc()} onInput={sc.setCurrentDc} />
              <div class="grid grid-cols-[1fr_auto] gap-1">
                <NumberField label="Output" value={sc.dcGainValue()} onInput={sc.setDcGainValue} />
                <SelectField
                  label="Unit"
                  value={sc.dcGainUnit()}
                  onChange={(next) => sc.setDcGainUnit(next as GainUnit)}
                  options={gainUnitOptions}
                />
              </div>
            </div>
          </div>

          <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
            <h3 class="font-mono text-2xl font-black text-ink dark:text-white">Replicators</h3>
            <div class="grid grid-cols-3 gap-2">
              <NumberField label="Days" value={sc.replicatorDays()} onInput={sc.setReplicatorDays} min={0} step={1} />
              <NumberField
                label="Hours"
                value={sc.replicatorHours()}
                onInput={sc.setReplicatorHours}
                min={0}
                step={1}
              />
              <NumberField
                label="Minutes"
                value={sc.replicatorMinutes()}
                onInput={sc.setReplicatorMinutes}
                min={0}
                step={1}
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <NumberField
                label="Retained DC"
                value={sc.retainedDcReplicator()}
                onInput={sc.setRetainedDcReplicator}
                min={1}
                step={0.01}
              />
              <NumberField
                label="Retained SC"
                value={sc.retainedSeReplicator()}
                onInput={sc.setRetainedSeReplicator}
                min={1}
                step={0.01}
              />
            </div>
          </div>

          <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
            <h3 class="font-mono text-2xl font-black text-ink dark:text-white">Time Skips</h3>
            <div class="grid grid-cols-3 gap-2">
              <NumberField label="Small" value={sc.timeSkipSmall()} onInput={sc.setTimeSkipSmall} min={0} step={1} />
              <NumberField label="Medium" value={sc.timeSkipMedium()} onInput={sc.setTimeSkipMedium} min={0} step={1} />
              <NumberField label="Large" value={sc.timeSkipLarge()} onInput={sc.setTimeSkipLarge} min={0} step={1} />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <div class="mb-1 flex items-center gap-2">
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">
                    Online Hours/Day
                  </p>
                  <Tooltip content="First 10 hours add 38 skip minutes each hour. Alpha level scales the bonus minutes by +1% per level." />
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={sc.onlineHoursPerDay()}
                  onInput={(event) => {
                    const next = sanitizeNumberishInput(event.currentTarget.value)
                    if (!isValidNumberishInput(next)) return
                    sc.setOnlineHoursPerDay(next)
                  }}
                  class="w-full rounded border border-ink/20 bg-white px-2 py-2 text-sm font-semibold text-ink outline-none ring-brand/40 focus:ring dark:border-white/20 dark:bg-[#1a2638] dark:text-white"
                />
              </div>
              <NumberField
                label="Alpha Supplies"
                value={sc.alphaSuppliesLevel()}
                onInput={sc.setAlphaSuppliesLevel}
                min={0}
                step={1}
              />
            </div>
            <p class="text-xs text-ink/70 dark:text-white/70">
              Total skip: {formatDurationMinutes(totalSkipMinutes())}
            </p>
          </div>

          <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
            <h3 class="font-mono text-xl font-black text-ink dark:text-white">Future Boosts</h3>
            <div class="grid grid-cols-2 gap-2">
              <NumberField
                label="DC %"
                value={sc.futureDcBoostPct()}
                onInput={sc.setFutureDcBoostPct}
                min={0}
                step={0.1}
              />
              <NumberField
                label="SC %"
                value={sc.futureScBoostPct()}
                onInput={sc.setFutureScBoostPct}
                min={0}
                step={0.1}
              />
            </div>
          </div>
        </aside>

        <section class="overflow-x-auto rounded-2xl border border-ink/15 bg-white/75 p-3 dark:border-white/15 dark:bg-[#162235]/80">
          <div class="flex min-w-[640px] items-start gap-3">
            <For each={outputs()}>
              {(panel, index) => (
                <article class="w-[290px] shrink-0 rounded-xl border border-ink/15 bg-white/85 p-2 dark:border-white/15 dark:bg-[#1c2c43]">
                  <div class="grid grid-cols-[1fr_auto] gap-2">
                    <select
                      value={panel.goalType}
                      onChange={(event) => sc.setPanelGoal(panel.id, event.currentTarget.value as ScGoalType)}
                      class="rounded border border-ink/20 bg-white px-2 py-2 font-mono text-2xl font-black text-ink outline-none ring-brand/40 focus:ring dark:border-white/20 dark:bg-[#253a56] dark:text-white"
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
                      <span class="text-accent dark:text-[#8ce3ff]">{formatDurationMinutes(panel.totalMinutes)}</span>
                    </div>
                    <div class="grid grid-cols-[1fr_auto] px-2 py-1.5 font-mono text-lg font-bold dark:text-white">
                      <span>Progress</span>
                      <span class="text-accent dark:text-[#8ce3ff]">{formatPercent(panel.progressPct, 2)}</span>
                    </div>
                  </div>

                  <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                    <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                      <span>Remaining</span>
                      <span class="text-accent dark:text-[#8ce3ff]">
                        {formatDurationMinutes(panel.remainingMinutes)}
                      </span>
                    </div>
                    <div class="px-2 py-1.5 text-center font-mono text-2xl font-black text-accent dark:text-[#8ce3ff]">
                      {formatTimestampFromMinutes(panel.remainingMinutes, sc.timezone())}
                    </div>
                  </div>

                  <Show when={totalSkipMinutes() > 0}>
                    <div class="mt-2 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                      <div class="grid grid-cols-[1fr_auto] border-b border-ink/15 px-2 py-1.5 font-mono text-lg font-bold dark:border-white/15 dark:text-white">
                        <span>After Skips</span>
                        <span class="text-accent dark:text-[#8ce3ff]">
                          {formatDurationMinutes(panel.afterSkipsMinutes)}
                        </span>
                      </div>
                      <div class="px-2 py-1.5 text-center font-mono text-2xl font-black text-accent dark:text-[#8ce3ff]">
                        {formatTimestampFromMinutes(panel.afterSkipsMinutes, sc.timezone())}
                      </div>
                    </div>
                  </Show>

                  <div class="mt-2 grid grid-cols-[1fr_24px] gap-2">
                    <div class="rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
                      <h4 class="border-b border-ink/15 px-2 py-1.5 text-center font-mono text-2xl font-black text-ink dark:border-white/15 dark:text-white">
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
