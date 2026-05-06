import { For } from "solid-js"
import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import { NumberField, blurOnEnterOrEscape } from "../../components/ui/formControls"
import { formatLocalTimestampFromMinutes } from "../../lib/timeFormat"
import type { GainUnit } from "../og/ogTypes"
import { usePenroseContext } from "./penroseContext"

const gainUnitOptions: Array<{ value: GainUnit; label: string }> = [
  { value: "sec", label: "sec" },
  { value: "min", label: "min" },
  { value: "hour", label: "hour" },
]

export const PenroseLeftColumn = () => {
  const penrose = usePenroseContext()
  return (
    <div class="space-y-4">
      <InfoCard title="Inputs">
        <div class="grid gap-2">
          <NumberField
            label="Status"
            value={penrose.statusAmount()}
            onInput={penrose.setStatusAmount}
            min={0}
            step={0.01}
          />
          <NumberField
            label="Juno output"
            value={penrose.junoGainValue()}
            onInput={penrose.setJunoGainValue}
            min={0}
            step={0.01}
            inlineAccessory={
              <div class="flex items-center gap-1">
                <span class="text-xs font-semibold uppercase tracking-[0.1em] text-ink/70 dark:text-white/70">/</span>
                <select
                  value={penrose.junoGainUnit()}
                  onChange={(event) => penrose.setJunoGainUnit(event.currentTarget.value as GainUnit)}
                  onKeyDown={blurOnEnterOrEscape}
                  class="w-[7rem] rounded-xl border border-ink/20 bg-white px-2 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
                >
                  <For each={gainUnitOptions}>{(option) => <option value={option.value}>{option.label}</option>}</For>
                </select>
              </div>
            }
          />
        </div>
      </InfoCard>

      <InfoCard title="Goal">
        <div class="rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
          <MetricRow label="Cycle" value={penrose.goalCycle()} />
          <MetricRow label="Cost" value={penrose.goalCost()} />
          <MetricRow label="Progress" value={penrose.goalProgress()} />
          <MetricRow label="ETA" value={penrose.etaLabel()} />
          <MetricRow
            label="Finish date"
            value={formatLocalTimestampFromMinutes(penrose.etaMinutes())}
            withBorder={false}
          />
        </div>
      </InfoCard>
    </div>
  )
}
