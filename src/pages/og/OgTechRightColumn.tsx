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
        rows={[
          ...(bestTech()
            ? [
                {
                  item: `OG${bestTech()!.id}`,
                  targetLevel: bestTech()!.level,
                  value: "-",
                  data: secondsToLabel(bestTech()!.etaSeconds),
                },
              ]
            : []),
          ...og.topFive().map((entry) => ({
            item: `OG${entry.id}`,
            targetLevel: entry.level,
            value: formatPercentFromRatio(entry.relative / 100, 0),
            data: secondsToLabel(entry.etaSeconds),
          })),
        ]}
        dataHeader="Remaining"
        columnRatios={[35, 30, 35]}
      />

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Index each={og.techCardRows()}>
          {(tech) => (
            <article class="rounded-xl border border-ink/15 bg-white p-3 dark:border-white/15 dark:bg-[#23344d]">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <Show
                    when={tech().tooltip}
                    fallback={<p class="text-base font-bold text-ink dark:text-white">{tech().label}</p>}
                  >
                    <Tooltip content={tech().tooltip!} raw asChild>
                      <p class="text-base font-bold text-ink dark:text-white">{tech().label}</p>
                    </Tooltip>
                  </Show>
                </div>
                <span class="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-ink/85 dark:text-white/85">
                  {formatPercentFromRatio(tech().relative / 100, 0)}
                </span>
              </div>
              <div class="mt-3 grid grid-cols-[1fr_auto] items-end">
                <IntegerField
                  label="Level"
                  value={String(tech().level)}
                  onInput={(next) => og.setTechLevel(tech().id, parseNumberish(next))}
                  step={1}
                  min={0}
                  max={tech().maxLevel}
                />
                <button
                  type="button"
                  class="h-8 w-8 rounded-lg border border-ink/25 bg-white/90 text-lg text-ink/85 transition hover:-translate-y-0.5 hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
                  onClick={() => og.buyNextForTech(tech().id)}
                  disabled={tech().nextLevel === null}
                  title={tech().nextLevel === null ? "Max level reached" : "Buy next level"}
                  aria-label={`Buy next level for ${tech().label}`}
                >
                  🛒
                </button>
              </div>
              <div class="mt-3 space-y-1 text-xs text-ink/75 dark:text-white/75">
                <p>ETA: {secondsToLabel(tech().etaSeconds)}</p>
                <p class="font-mono">Cost: {tech().nextCost}</p>
              </div>
            </article>
          )}
        </Index>
      </div>
    </>
  )
}
