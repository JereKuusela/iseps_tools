import { Index, Show } from "solid-js"
import { BestNextSummary } from "../../components/layout/BestNextSummary"
import { MetricRow } from "../../components/layout/contentBlocks"
import { IntegerField } from "../../components/ui/formControls"
import { Tooltip } from "../../components/ui/Tooltip"
import { formatPercentFromRatio } from "../../lib/numberFormat"
import { formatTimeDurationFromSeconds } from "../../lib/timeFormat"
import { useOgTechContext } from "./ogTechContext"

export const OgTechRightColumn = () => {
  const og = useOgTechContext()
  const bestTech = () => og.bestTech()
  const parseNumberish = (value: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 0
    return parsed
  }

  const secondsToLabel = (seconds: number) => formatTimeDurationFromSeconds(seconds)

  return (
    <>
      <BestNextSummary
        buyAction={og.buyNextBest}
        buyDisabled={!bestTech()}
        buyLabel="Buy best next"
        bulkActions={[
          { label: "Auto buy < 1h", onClick: og.autoBuyUnderHour },
          { label: "Auto buy < 1d", onClick: og.autoBuyUnderDay },
          { label: "Clear tech", onClick: og.clearTechLevels },
        ]}
        footer={<MetricRow label="Total techs" value={og.totalTechLevels()} withBorder={false} />}
        rows={og.topSix().map((entry) => ({
          id: entry.id,
          item: `OG${entry.id}`,
          targetLevel: entry.level,
          value: formatPercentFromRatio(entry.relative / 100, 0),
          data: secondsToLabel(entry.etaSeconds),
        }))}
        rowAction={(id) => og.buyNextForTech(Number(id))}
        dataHeader="Remaining"
        columnRatios={[35, 30, 35]}
      />

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Index each={og.techCardRows()}>
          {(tech) => (
            <article class="rounded-xl border border-ink/15 bg-white p-3 dark:border-white/15 dark:bg-[#23344d]">
              <IntegerField
                label={
                  <Tooltip content={tech().tooltip} raw asChild>
                    <span class="text-base font-bold normal-case tracking-normal text-ink dark:text-white">
                      {tech().label}
                    </span>
                  </Tooltip>
                }
                value={String(tech().level)}
                onInput={(next) => og.setTechLevel(tech().id, parseNumberish(next))}
                step={1}
                min={0}
                max={tech().maxLevel}
                align="right"
              />
              <div class="mt-2 grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs text-ink/75 dark:text-white/75">
                <span class="font-semibold uppercase tracking-[0.08em] text-ink/60 dark:text-white/60">Cost</span>
                <span class="font-mono text-right">{tech().nextCost}</span>
                <span class="font-semibold uppercase tracking-[0.08em] text-ink/60 dark:text-white/60">ETA</span>
                <span class="font-mono text-right">{secondsToLabel(tech().etaSeconds)}</span>
              </div>
            </article>
          )}
        </Index>
      </div>
    </>
  )
}
