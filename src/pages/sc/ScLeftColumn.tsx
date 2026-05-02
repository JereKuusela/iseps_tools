import {
  blurOnEnterOrEscape,
  IntegerField,
  isValidNumberishInput,
  LabelField,
  MultiplierField,
  NumberField,
  PercentField,
  sanitizeNumberishInput,
} from "../../components/ui/formControls"
import { SummaryInputModal } from "../../components/ui/SummaryInputModal"
import { Tooltip } from "../../components/ui/Tooltip"
import type { ScGainUnit } from "../../lib/scContext"
import { useScContext } from "../../lib/scContext"
import { formatTimeDurationFromMinutes } from "../../lib/timeFormat"
import type { TooltipKey } from "../../lib/tooltips"

const gainUnitOptions: { value: ScGainUnit; label: string }[] = [
  { value: "min", label: "min" },
  { value: "hour", label: "hour" },
  { value: "day", label: "day" },
]

type ScLeftColumnProps = {
  replicatorDurationLabel: string
  dcReplicatorTotal: number
  scReplicatorTotal: number
  dcReplicatorTimeBonus: number
  scReplicatorTimeBonus: number
  totalSkipMinutes: number
  onlineBonusMultiplier: number
  formatMultiplier: (value: number) => string
}

type SectionHeadingProps = {
  title: string
  tooltip?: TooltipKey
}

const SectionHeading = (props: SectionHeadingProps) => (
  <div class="flex items-center gap-1.5">
    <h3 class="font-mono text-md font-black text-ink dark:text-white">{props.title}</h3>
    {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
  </div>
)

export const ScLeftColumn = (props: ScLeftColumnProps) => {
  const sc = useScContext()

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
          <NumberField label="SE" value={sc.currentSe()} onInput={sc.setCurrentSe} min={0} step={1} inline />
          <NumberField
            label="Battery 1 DC"
            value={sc.battery1DcCost()}
            onInput={sc.setBattery1DcCost}
            inline
            tooltip="sc.battery1"
          />
          <NumberField
            label="Current DC"
            value={sc.currentDc()}
            onInput={sc.setCurrentDc}
            inline
            tooltip="sc.current"
          />
          <NumberField
            label="Output"
            value={sc.dcGainValue()}
            onInput={sc.setDcGainValue}
            inline
            tooltip="sc.gain"
            inlineAccessory={
              <div class="flex items-center gap-1">
                <span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink/70 dark:text-white/70">/</span>
                <select
                  value={sc.dcGainUnit()}
                  onChange={(event) => sc.setDcGainUnit(event.currentTarget.value as ScGainUnit)}
                  onKeyDown={blurOnEnterOrEscape}
                  class="w-[5.5rem] rounded-xl border border-ink/20 bg-white px-2 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
                >
                  {gainUnitOptions.map((option) => (
                    <option value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            }
          />
        </div>
      </div>

      <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
        <SectionHeading title="Replicators" />
        <SummaryInputModal label="Time in SE" value={props.replicatorDurationLabel} tooltip="sc.time">
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

        <SummaryInputModal
          label="DC"
          value={props.dcReplicatorTotal.toString()}
          onInput={(next) => syncRetainedFromTotal(next, props.dcReplicatorTimeBonus, sc.setRetainedDcReplicator)}
          valueFormat="multiplier"
          tooltip="sc.replicator_dc"
        >
          <div class="grid grid-cols-2 gap-2">
            <LabelField label="From time" value={props.formatMultiplier(props.dcReplicatorTimeBonus)} inline />
            <LabelField label="Retained" value={"x" + sc.retainedDcReplicator()} inline />
          </div>
        </SummaryInputModal>

        <SummaryInputModal
          label="SC"
          value={props.scReplicatorTotal.toString()}
          onInput={(next) => syncRetainedFromTotal(next, props.scReplicatorTimeBonus, sc.setRetainedSeReplicator)}
          valueFormat="multiplier"
          tooltip="sc.replicator_sc"
        >
          <div class="grid grid-cols-2 gap-2">
            <LabelField label="From time" value={props.formatMultiplier(props.scReplicatorTimeBonus)} inline />
            <LabelField label="Retained" value={"x" + sc.retainedSeReplicator()} inline />
          </div>
        </SummaryInputModal>
      </div>

      <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
        <SectionHeading title="Time boosts" />
        <SummaryInputModal
          label="Time Skips"
          value={formatTimeDurationFromMinutes(props.totalSkipMinutes)}
          tooltip="sc.timeskip"
        >
          <div class="grid grid-cols-3 gap-2">
            <IntegerField label="S" value={sc.timeSkipSmall()} onInput={sc.setTimeSkipSmall} min={0} step={1} inline />
            <IntegerField
              label="M"
              value={sc.timeSkipMedium()}
              onInput={sc.setTimeSkipMedium}
              min={0}
              step={1}
              inline
            />
            <IntegerField label="L" value={sc.timeSkipLarge()} onInput={sc.setTimeSkipLarge} min={0} step={1} inline />
          </div>
        </SummaryInputModal>

        <SummaryInputModal
          label="Online bonus"
          value={props.formatMultiplier(props.onlineBonusMultiplier)}
          tooltip="sc.onlineBonus"
        >
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div class="grid grid-cols-[auto_1fr] items-center gap-2">
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Online Hrs</p>
              <input
                type="text"
                inputMode="decimal"
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
              inline
            />
          </div>
        </SummaryInputModal>
      </div>

      <div class="space-y-2 rounded-xl border border-ink/15 bg-white/80 p-2 dark:border-white/15 dark:bg-[#1d2c42]">
        <SectionHeading title="Future Boosts" tooltip="sc.future" />
        <div class="grid grid-cols-2 gap-2">
          <PercentField label="DC %" value={sc.futureDcBoostPct()} onInput={sc.setFutureDcBoostPct} inline />
          <PercentField label="SC %" value={sc.futureScBoostPct()} onInput={sc.setFutureScBoostPct} inline />
        </div>
      </div>
    </aside>
  )
}
