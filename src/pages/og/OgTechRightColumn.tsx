import { For } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { StatTile } from "../../components/layout/StatTile"
import { NumberField } from "../../components/ui/formControls"
import type { TechCardRow, TopTechEntry } from "./ogTypes"

type BestTech = {
  id: number
  level: number
  etaSeconds: number
} | null

type OgTechRightColumnProps = {
  totalTechLevels: number
  bestTech: BestTech
  seEffect: number
  topFive: TopTechEntry[]
  techCardRows: TechCardRow[]
  onAutoBuyUnderHour: () => void
  onBuyNextBest: () => void
  onSetTechLevel: (id: number, next: number) => void
  onBuyTechLevel: (id: number) => void
  secondsToLabel: (seconds: number) => string
  formatPercent: (value: number) => string
  parseNumberish: (value: string) => number
}

export const OgTechRightColumn = (props: OgTechRightColumnProps) => {
  return (
    <>
      <InfoCard title="Recommendations" contentClass="">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-ink/70 dark:text-white/70">Score compares next purchases by value per cost.</p>
          <button
            type="button"
            class="rounded-lg border border-ink/25 px-2.5 py-1 text-xs font-semibold text-ink/80 transition hover:bg-ink hover:text-white dark:border-white/30 dark:text-white/80 dark:hover:bg-white/20"
            onClick={props.onAutoBuyUnderHour}
          >
            Auto buy &lt; 1hr
          </button>
        </div>

        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <StatTile label="Total techs" value={props.totalTechLevels} />
          <StatTile
            label="Best next"
            value={props.bestTech ? `OG${props.bestTech.id} -> ${props.bestTech.level}` : "-"}
            secondary={props.bestTech ? props.secondsToLabel(props.bestTech.etaSeconds) : "-"}
          />
          <StatTile
            label="SE effect"
            value={props.seEffect.toFixed(4)}
            action={
              <button
                type="button"
                class="rounded-lg border border-ink/25 px-2.5 py-1 text-xs font-semibold text-ink/80 transition hover:bg-ink hover:text-white dark:border-white/30 dark:text-white/80 dark:hover:bg-white/20"
                onClick={props.onBuyNextBest}
              >
                Buy best
              </button>
            }
          />
        </div>

        <div class="mt-4 overflow-x-auto rounded-xl border border-ink/10 bg-white dark:border-white/15 dark:bg-[#22344d]">
          <table class="w-full min-w-[420px] border-collapse text-left text-sm">
            <thead class="bg-mist/80 text-xs uppercase tracking-[0.1em] text-ink/70 dark:bg-[#1a2a3f] dark:text-white/70">
              <tr>
                <th class="px-3 py-2">Up next</th>
                <th class="px-3 py-2">Remaining</th>
                <th class="px-3 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.topFive}>
                {(entry) => (
                  <tr class="border-t border-ink/10 dark:border-white/10">
                    <td class="px-3 py-2 font-semibold text-ink dark:text-white">{`OG${entry.id} -> ${entry.level}`}</td>
                    <td class="px-3 py-2 text-ink/80 dark:text-white/80">{props.secondsToLabel(entry.etaSeconds)}</td>
                    <td class="px-3 py-2 text-ink/80 dark:text-white/80">
                      {props.formatPercent(entry.relative / 100)}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </InfoCard>

      <InfoCard title="OG Tech Grid">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <For each={props.techCardRows}>
            {(tech) => (
              <article class="rounded-xl border border-ink/15 bg-white p-3 dark:border-white/15 dark:bg-[#23344d]">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-xs uppercase tracking-[0.1em] text-ink/60 dark:text-white/60">Tech</p>
                    <p class="text-base font-bold text-ink dark:text-white">{tech.label}</p>
                  </div>
                  <span class="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-ink/85 dark:text-white/85">
                    {props.formatPercent(tech.relative / 100)}
                  </span>
                </div>
                <div class="mt-3 grid grid-cols-[1fr_auto] items-end gap-2">
                  <NumberField
                    label="Level"
                    value={String(tech.level)}
                    onInput={(next) => props.onSetTechLevel(tech.id, props.parseNumberish(next))}
                    step={1}
                    inline
                    inlineGridClass="grid-cols-[auto_minmax(0,1fr)]"
                  />
                  <button
                    type="button"
                    class="h-9 rounded-lg border border-ink/25 px-3 text-sm font-semibold text-ink/80 transition hover:bg-ink hover:text-white dark:border-white/30 dark:text-white/80 dark:hover:bg-white/20"
                    onClick={() => props.onBuyTechLevel(tech.id)}
                  >
                    +1
                  </button>
                </div>
                <div class="mt-3 space-y-1 text-xs text-ink/75 dark:text-white/75">
                  <p>ETA: {props.secondsToLabel(tech.etaSeconds)}</p>
                  <p class="font-mono">Cost: {tech.nextCost}</p>
                </div>
              </article>
            )}
          </For>
        </div>
      </InfoCard>
    </>
  )
}
