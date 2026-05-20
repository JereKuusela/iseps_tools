import { createMemo } from "solid-js"
import {
  blurOnEnterOrEscape,
  NumberFieldWithUnit,
  IntegerField,
  isValidNumberishInput,
  LabelField,
  NumberField,
  PercentField,
  sanitizeNumberishInput,
} from "../../components/ui/formControls"
import { SummaryInputModal } from "../../components/ui/SummaryInputModal"
import { Tooltip } from "../../components/ui/Tooltip"
import { LargeNumber } from "../../lib/largeNumber"
import { formatCompactMultiplier } from "../../lib/numberFormat"
import { calculateDcReplicator, calculateSeReplicator } from "../../lib/scCalculator"
import type { ScGainUnit } from "../../lib/scContext"
import { useScContext } from "../../lib/scContext"
import { formatTimeDurationFromMinutes } from "../../lib/timeFormat"
import type { TooltipKey } from "../../lib/tooltips"

const units = ["day", "hour", "min"] as const

type SectionHeadingProps = {
  title: string
  tooltip?: TooltipKey
  onRefresh?: () => void
}

const SectionHeading = (props: SectionHeadingProps) => (
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-1.5">
      <h3 class="font-mono text-md font-black text-ink dark:text-white">{props.title}</h3>
      {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
    </div>
    {props.onRefresh ? (
      <Tooltip content="sc.refresh" asChild>
        <button
          type="button"
          onClick={props.onRefresh}
          aria-label="Refresh replicators"
          class="rounded-lg border border-ink/20 p-1.5 text-ink transition hover:bg-ink/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4">
            <path
              d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </Tooltip>
    ) : null}
  </div>
)

export const ScLeftColumn = () => {
  const sc = useScContext()

  const MINUTES_PER_HOUR = 60
  const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

  const parseFiniteNumber = (value: string, fallback = 0) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return parsed
  }

  const parsePositiveInt = (value: string) => Math.max(0, Math.floor(parseFiniteNumber(value, 0)))
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

  const parseLargeNumberSafe = (value: string): LargeNumber => {
    const raw = value.trim()
    if (raw === "") return LargeNumber.zero()

    try {
      return LargeNumber.parse(raw)
    } catch {
      return LargeNumber.zero()
    }
  }

  const scExponentForSeInversed = (se: number, branchSe = se) => {
    if (branchSe < 100) return 1 / (0.1754 - (3 * se ** 2.13) / 1e6)
    return 0.1754 + 0.026 * se ** 1.25
  }

  const minutesInSe = () => {
    return (
      parsePositiveInt(sc.replicatorDays()) * MINUTES_PER_DAY +
      parsePositiveInt(sc.replicatorHours()) * MINUTES_PER_HOUR +
      parsePositiveInt(sc.replicatorMinutes())
    )
  }

  const currentSe = createMemo(() => Math.max(0, Math.floor(parseFiniteNumber(sc.currentSe(), 0))))
  const retainedDc = createMemo(() => Math.max(1, parseFiniteNumber(sc.retainedDcReplicator(), 1)))
  const retainedSc = createMemo(() => Math.max(1, parseFiniteNumber(sc.retainedSeReplicator(), 1)))
  const replicatorDurationLabel = createMemo(() => formatTimeDurationFromMinutes(minutesInSe()))
  const dcReplicatorTotal = createMemo(() => calculateDcReplicator(currentSe(), minutesInSe(), retainedDc()))
  const scReplicatorTotal = createMemo(() => calculateSeReplicator(currentSe(), minutesInSe(), retainedSc()))
  const dcReplicatorTimeBonus = createMemo(() => calculateDcReplicator(currentSe(), minutesInSe(), 0))
  const scReplicatorTimeBonus = createMemo(() => calculateSeReplicator(currentSe(), minutesInSe(), 0))
  const totalSkipMinutes = createMemo(() => {
    const small = Math.max(0, Math.floor(parseFiniteNumber(sc.timeSkipSmall(), 0)))
    const medium = Math.max(0, Math.floor(parseFiniteNumber(sc.timeSkipMedium(), 0)))
    const large = Math.max(0, Math.floor(parseFiniteNumber(sc.timeSkipLarge(), 0)))
    return small * 3 + medium * 5 + large * 12
  })
  const onlineBonusMultiplier = createMemo(() => {
    const onlineHours = clamp(parseFiniteNumber(sc.onlineHoursPerDay(), 0), 0, 24)
    const boostedHours = Math.min(onlineHours, 10)
    const baseExtraPerHour = 38
    const alphaMultiplier = 1 + Math.max(0, parseFiniteNumber(sc.alphaSuppliesLevel(), 0)) * 0.01
    const onlineExtraMinutes = boostedHours * baseExtraPerHour * alphaMultiplier
    return 1 + onlineExtraMinutes / 1440
  })

  const setReplicatorMinutesFromTotal = (totalMinutes: number) => {
    const safeTotal = Math.max(0, Math.floor(totalMinutes))
    const days = Math.floor(safeTotal / MINUTES_PER_DAY)
    const remainderAfterDays = safeTotal - days * MINUTES_PER_DAY
    const hours = Math.floor(remainderAfterDays / MINUTES_PER_HOUR)
    const minutes = remainderAfterDays - hours * MINUTES_PER_HOUR

    sc.setReplicatorDays(days.toString())
    sc.setReplicatorHours(hours.toString())
    sc.setReplicatorMinutes(minutes.toString())
  }

  const stampReplicatorManualEdit = () => {
    sc.setReplicatorTimeEditedAtMs(Date.now().toString())
  }

  const handleReplicatorDaysInput = (next: string) => {
    sc.setReplicatorDays(next)
    stampReplicatorManualEdit()
  }

  const handleReplicatorHoursInput = (next: string) => {
    sc.setReplicatorHours(next)
    stampReplicatorManualEdit()
  }

  const handleReplicatorMinutesInput = (next: string) => {
    sc.setReplicatorMinutes(next)
    stampReplicatorManualEdit()
  }

  const refreshReplicators = () => {
    const nowMs = Date.now()
    const lastEditedAtMs = parseFiniteNumber(sc.replicatorTimeEditedAtMs(), 0)
    if (lastEditedAtMs <= 0) {
      sc.setReplicatorTimeEditedAtMs(nowMs.toString())
      return
    }

    const elapsedMinutes = Math.max(0, Math.floor((nowMs - lastEditedAtMs) / 60000))
    if (elapsedMinutes <= 0) {
      sc.setReplicatorTimeEditedAtMs(nowMs.toString())
      return
    }

    const se = Math.max(0, Math.floor(parseFiniteNumber(sc.currentSe(), 0)))
    const retainedDc = Math.max(1, parseFiniteNumber(sc.retainedDcReplicator(), 1))
    const retainedSc = Math.max(1, parseFiniteNumber(sc.retainedSeReplicator(), 1))
    const baselineMinutes = minutesInSe()
    const updatedMinutes = baselineMinutes + elapsedMinutes

    const baselineDcReplicator = calculateDcReplicator(se, baselineMinutes, retainedDc)
    const updatedDcReplicator = calculateDcReplicator(se, updatedMinutes, retainedDc)
    const baselineScReplicator = calculateSeReplicator(se, baselineMinutes, retainedSc)
    const updatedScReplicator = calculateSeReplicator(se, updatedMinutes, retainedSc)

    const dcReplicatorScale =
      baselineDcReplicator <= 0 ? updatedDcReplicator : updatedDcReplicator / baselineDcReplicator
    const scReplicatorScale =
      baselineScReplicator <= 0 ? updatedScReplicator : updatedScReplicator / baselineScReplicator

    if (Number.isFinite(dcReplicatorScale) && dcReplicatorScale > 0) {
      const currentDc = parseLargeNumberSafe(sc.currentDc()).multiply(dcReplicatorScale)
      const dcGainValue = parseLargeNumberSafe(sc.dcGainValue()).multiply(dcReplicatorScale)
      sc.setCurrentDc(currentDc.toString())
      sc.setDcGainValue(dcGainValue.toString())
    }

    if (Number.isFinite(scReplicatorScale) && scReplicatorScale > 0) {
      const dcExponent = scExponentForSeInversed(se)
      const batteryReductionScale = scReplicatorScale ** dcExponent

      if (Number.isFinite(batteryReductionScale) && batteryReductionScale > 0) {
        const updatedBatteryCost = parseLargeNumberSafe(sc.battery1DcCost()).divide(batteryReductionScale)
        sc.setBattery1DcCost(updatedBatteryCost.toString())
      }
    }

    setReplicatorMinutesFromTotal(updatedMinutes)
    sc.setReplicatorTimeEditedAtMs(nowMs.toString())
  }

  const syncRetainedFromTotal = (nextTotalRaw: string, timeBonus: number, setRetained: (next: string) => string) => {
    const parsed = Number(nextTotalRaw)
    if (!Number.isFinite(parsed)) return

    const retained = Math.max(1, parsed - timeBonus)
    setRetained(retained.toString())
  }

  return (
    <aside class="space-y-3">
      <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
        <div class="grid gap-2">
          <NumberField label="SE" value={sc.currentSe()} onInput={sc.setCurrentSe} min={0} step={1} />
          <NumberField
            label="Battery 1 DC"
            value={sc.battery1DcCost()}
            onInput={sc.setBattery1DcCost}
            tooltip="sc.battery1"
          />
          <NumberField label="Current DC" value={sc.currentDc()} onInput={sc.setCurrentDc} tooltip="sc.current" />
          <NumberFieldWithUnit
            label="Output"
            value={sc.dcGainValue()}
            onInput={sc.setDcGainValue}
            tooltip="sc.gain"
            unit={sc.dcGainUnit()}
            onUnitChange={(next) => sc.setDcGainUnit(next as ScGainUnit)}
            units={units}
          />
        </div>
      </div>

      <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
        <SectionHeading title="Replicators" onRefresh={refreshReplicators} />
        <SummaryInputModal label="Time in SE" value={replicatorDurationLabel()} tooltip="sc.time">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <IntegerField label="D" value={sc.replicatorDays()} onInput={handleReplicatorDaysInput} min={0} step={1} />
            <IntegerField
              label="H"
              value={sc.replicatorHours()}
              onInput={handleReplicatorHoursInput}
              min={0}
              step={1}
            />
            <IntegerField
              label="M"
              value={sc.replicatorMinutes()}
              onInput={handleReplicatorMinutesInput}
              min={0}
              step={1}
            />
          </div>
        </SummaryInputModal>

        <SummaryInputModal
          label="DC"
          value={dcReplicatorTotal().toString()}
          onInput={(next) => syncRetainedFromTotal(next, dcReplicatorTimeBonus(), sc.setRetainedDcReplicator)}
          valueFormat="multiplier"
          tooltip="sc.replicator_dc"
        >
          <div class="grid grid-cols-2 gap-2">
            <LabelField label="From time" value={formatCompactMultiplier(dcReplicatorTimeBonus())} />
            <LabelField label="Retained" value={"x" + sc.retainedDcReplicator()} />
          </div>
        </SummaryInputModal>

        <SummaryInputModal
          label="SC"
          value={scReplicatorTotal().toString()}
          onInput={(next) => syncRetainedFromTotal(next, scReplicatorTimeBonus(), sc.setRetainedSeReplicator)}
          valueFormat="multiplier"
          tooltip="sc.replicator_sc"
        >
          <div class="grid grid-cols-2 gap-2">
            <LabelField label="From time" value={formatCompactMultiplier(scReplicatorTimeBonus())} />
            <LabelField label="Retained" value={"x" + sc.retainedSeReplicator()} />
          </div>
        </SummaryInputModal>
      </div>

      <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
        <SectionHeading title="Time boosts" />
        <SummaryInputModal
          label="Time Skips"
          value={formatTimeDurationFromMinutes(totalSkipMinutes())}
          tooltip="sc.timeskip"
        >
          <div class="grid grid-cols-3 gap-2">
            <IntegerField label="S" value={sc.timeSkipSmall()} onInput={sc.setTimeSkipSmall} min={0} step={1} />
            <IntegerField label="M" value={sc.timeSkipMedium()} onInput={sc.setTimeSkipMedium} min={0} step={1} />
            <IntegerField label="L" value={sc.timeSkipLarge()} onInput={sc.setTimeSkipLarge} min={0} step={1} />
          </div>
        </SummaryInputModal>

        <SummaryInputModal
          label="Online bonus"
          value={formatCompactMultiplier(onlineBonusMultiplier())}
          tooltip="sc.onlineBonus"
        >
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div class="grid grid-cols-[auto_1fr] items-center gap-2">
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Online Hrs</p>
              <input
                type="text"
                value={sc.onlineHoursPerDay()}
                onKeyDown={blurOnEnterOrEscape}
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
            />
          </div>
        </SummaryInputModal>
      </div>

      <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
        <SectionHeading title="Future Boosts" tooltip="sc.future" />
        <div class="grid grid-cols-2 gap-2">
          <PercentField label="DC %" value={sc.futureDcBoostPct()} onInput={sc.setFutureDcBoostPct} />
          <PercentField label="SC %" value={sc.futureScBoostPct()} onInput={sc.setFutureScBoostPct} />
        </div>
      </div>
    </aside>
  )
}
