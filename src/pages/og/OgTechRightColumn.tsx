import { For, Index, Show, createSignal, onCleanup, onMount } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { StatTile } from "../../components/layout/StatTile"
import { IntegerField } from "../../components/ui/formControls"
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
  onAutoBuyUnderDay: () => void
  onClearTechLevels: () => void
  onBuyNextBest: () => void
  onSetTechLevel: (id: number, next: number) => void
  onBuyTechLevel: (id: number) => void
  secondsToLabel: (seconds: number) => string
  formatPercent: (value: number) => string
  parseNumberish: (value: string) => number
}

export const OgTechRightColumn = (props: OgTechRightColumnProps) => {
  const [isActionsOpen, setIsActionsOpen] = createSignal(false)
  let actionsMenuRef: HTMLDivElement | undefined

  onMount(() => {
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!actionsMenuRef) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (!actionsMenuRef.contains(target)) {
        setIsActionsOpen(false)
      }
    }

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActionsOpen(false)
      }
    }

    document.addEventListener("pointerdown", onDocumentPointerDown)
    document.addEventListener("keydown", onDocumentKeyDown)

    onCleanup(() => {
      document.removeEventListener("pointerdown", onDocumentPointerDown)
      document.removeEventListener("keydown", onDocumentKeyDown)
    })
  })

  const handleAction = (action: () => void) => {
    action()
    setIsActionsOpen(false)
  }

  return (
    <>
      <InfoCard title="Recommendations" contentClass="">
        <div class="relative z-20 flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-ink/70 dark:text-white/70">Score compares next purchases by value per cost.</p>
          <div class="relative z-30" ref={actionsMenuRef}>
            <button
              type="button"
              class="cursor-pointer rounded-lg border border-ink/25 px-2.5 py-1 text-xs font-semibold text-ink/80 transition hover:bg-ink hover:text-white dark:border-white/30 dark:text-white/80 dark:hover:bg-white/20"
              aria-haspopup="menu"
              aria-expanded={isActionsOpen()}
              onClick={() => setIsActionsOpen((current) => !current)}
            >
              Actions
            </button>
            <Show when={isActionsOpen()}>
              <div class="absolute right-0 top-full z-50 pt-1">
                <div class="w-40 overflow-hidden rounded-lg border border-ink/15 bg-white shadow-lg dark:border-white/20 dark:bg-[#22344d]">
                  <button
                    type="button"
                    class="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-ink/85 transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white focus-visible:outline-none dark:text-white/85 dark:hover:bg-white dark:hover:text-ink dark:focus-visible:bg-white dark:focus-visible:text-ink"
                    onClick={() => handleAction(props.onAutoBuyUnderHour)}
                  >
                    Auto buy &lt; 1h
                  </button>
                  <button
                    type="button"
                    class="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-ink/85 transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white focus-visible:outline-none dark:text-white/85 dark:hover:bg-white dark:hover:text-ink dark:focus-visible:bg-white dark:focus-visible:text-ink"
                    onClick={() => handleAction(props.onAutoBuyUnderDay)}
                  >
                    Auto buy &lt; 1d
                  </button>
                  <button
                    type="button"
                    class="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-ink/85 transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white focus-visible:outline-none dark:text-white/85 dark:hover:bg-white dark:hover:text-ink dark:focus-visible:bg-white dark:focus-visible:text-ink"
                    onClick={() => handleAction(props.onClearTechLevels)}
                  >
                    Clear tech
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </div>

        <div class="mt-3 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <div class="grid gap-2">
            <StatTile label="Total techs" value={props.totalTechLevels} />
            <StatTile
              label="Best next"
              value={props.bestTech ? `OG${props.bestTech.id} -> ${props.bestTech.level + 1}` : "-"}
              secondary={props.bestTech ? props.secondsToLabel(props.bestTech.etaSeconds) : "-"}
            />
            <button
              type="button"
              class="w-full rounded-lg border border-ink/25 px-2.5 py-1 text-xs font-semibold text-ink/80 transition hover:bg-ink hover:text-white dark:border-white/30 dark:text-white/80 dark:hover:bg-white/20"
              onClick={props.onBuyNextBest}
            >
              Buy best
            </button>
          </div>

          <div class="overflow-hidden rounded-xl border border-ink/10 bg-white dark:border-white/15 dark:bg-[#22344d]">
            <table class="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
              <thead class="bg-mist/80 text-[11px] uppercase tracking-[0.08em] text-ink/70 dark:bg-[#1a2a3f] dark:text-white/70 sm:text-xs">
                <tr>
                  <th class="px-2 py-1.5">Up next</th>
                  <th class="px-2 py-1.5">Remaining</th>
                  <th class="px-2 py-1.5">Value</th>
                </tr>
              </thead>
              <tbody>
                <For each={props.topFive}>
                  {(entry) => (
                    <tr class="border-t border-ink/10 dark:border-white/10">
                      <td class="px-2 py-1 font-semibold text-ink dark:text-white">{`OG${entry.id} -> ${entry.level}`}</td>
                      <td class="px-2 py-1 text-ink/80 dark:text-white/80">{props.secondsToLabel(entry.etaSeconds)}</td>
                      <td class="px-2 py-1 text-ink/80 dark:text-white/80">
                        {props.formatPercent(entry.relative / 100)}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </InfoCard>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Index each={props.techCardRows}>
          {(tech) => (
            <article class="rounded-xl border border-ink/15 bg-white p-3 dark:border-white/15 dark:bg-[#23344d]">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-base font-bold text-ink dark:text-white">{tech().label}</p>
                </div>
                <span class="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-ink/85 dark:text-white/85">
                  {props.formatPercent(tech().relative / 100)}
                </span>
              </div>
              <div class="mt-3 grid grid-cols-[1fr_auto] items-end gap-2">
                <IntegerField
                  label="Level"
                  value={String(tech().level)}
                  onInput={(next) => props.onSetTechLevel(tech().id, props.parseNumberish(next))}
                  step={1}
                  min={0}
                  max={tech().maxLevel}
                  inline
                  inlineGridClass="grid-cols-[auto_minmax(0,1fr)]"
                />
              </div>
              <div class="mt-3 space-y-1 text-xs text-ink/75 dark:text-white/75">
                <p>ETA: {props.secondsToLabel(tech().etaSeconds)}</p>
                <p class="font-mono">Cost: {tech().nextCost}</p>
              </div>
            </article>
          )}
        </Index>
      </div>
    </>
  )
}
