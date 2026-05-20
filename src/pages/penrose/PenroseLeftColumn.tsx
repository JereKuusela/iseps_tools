import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import { NumberField, NumberFieldWithUnit } from "../../components/ui/formControls"
import { formatLocalTimestampFromMinutes } from "../../lib/timeFormat"
import type { GainUnit } from "../og/ogTypes"
import { usePenroseContext } from "./penroseContext"

const units = ["hour", "min", "sec"] as const

export const PenroseLeftColumn = () => {
  const penrose = usePenroseContext()
  return (
    <div class="space-y-4">
      <InfoCard>
        <div class="grid gap-2">
          <NumberField
            label="Status"
            value={penrose.statusAmount()}
            onInput={penrose.setStatusAmount}
            min={0}
            step={0.01}
          />
          <NumberFieldWithUnit
            label="Juno output"
            value={penrose.junoGainValue()}
            onInput={penrose.setJunoGainValue}
            min={0}
            step={0.01}
            unit={penrose.junoGainUnit()}
            onUnitChange={(next) => penrose.setJunoGainUnit(next as GainUnit)}
            units={units}
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
