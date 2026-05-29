import { For, Index, Show, createSignal, onCleanup, onMount } from "solid-js"
import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import { IntegerField } from "../../components/ui/formControls"
import { formatPercentFromRatio } from "../../lib/numberFormat"
import { formatTimeDurationFromSeconds } from "../../lib/timeFormat"
import { useOgTechContext } from "./ogTechContext"

export const OgTechRightColumn = () => {
  const og = useOgTechContext()
  const [isActionsOpen, setIsActionsOpen] = createSignal(false)
  let actionsMenuRef: HTMLDivElement | undefined
  const bestTech = () => og.bestTech()
  const parseNumberish = (value: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 0
    return parsed
  }

  const secondsToLabel = (seconds: number) => formatTimeDurationFromSeconds(seconds)

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
      <InfoCard contentClass="">
        <div class="grid gap-3 lg:grid-cols-[420px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
          <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-stretch gap-2 lg:col-start-1 lg:row-start-1">
            <div class="rounded-xl border border-ink/10 bg-gradient-to-br from-mist via-white to-mist/70 p-3 dark:border-white/15 dark:from-[#263954] dark:via-[#22344d] dark:to-[#1c2c41]">
              <p class="text-xs uppercase tracking-[0.12em] text-ink/65 dark:text-white/65">Best next</p>
              <p class="mt-1 text-lg font-black text-ink dark:text-white">
                {bestTech() ? `OG${bestTech()!.id} → ${bestTech()!.level}` : "-"}
              </p>
              <p class="mt-1 text-2xl font-black leading-none text-accent dark:text-[#8ce3ff]">
                {bestTech() ? secondsToLabel(bestTech()!.etaSeconds) : "-"}
              </p>
            </div>
            <button
              type="button"
              class="h-full min-h-[88px] w-14 rounded-xl border border-ink/25 bg-white/90 text-2xl text-ink/85 transition hover:-translate-y-0.5 hover:bg-ink hover:text-white dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
              onClick={og.buyNextBest}
              title="Buy best next"
              aria-label="Buy best next"
            >
              🛒
            </button>
            <div class="relative" ref={actionsMenuRef}>
              <button
                type="button"
                class="h-full min-h-[88px] w-14 rounded-xl border border-ink/25 bg-white/90 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/85 transition hover:-translate-y-0.5 hover:bg-ink hover:text-white dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
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
                      onClick={() => handleAction(og.autoBuyUnderHour)}
                    >
                      Auto buy &lt; 1h
                    </button>
                    <button
                      type="button"
                      class="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-ink/85 transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white focus-visible:outline-none dark:text-white/85 dark:hover:bg-white dark:hover:text-ink dark:focus-visible:bg-white dark:focus-visible:text-ink"
                      onClick={() => handleAction(og.autoBuyUnderDay)}
                    >
                      Auto buy &lt; 1d
                    </button>
                    <button
                      type="button"
                      class="block w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-ink/85 transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white focus-visible:outline-none dark:text-white/85 dark:hover:bg-white dark:hover:text-ink dark:focus-visible:bg-white dark:focus-visible:text-ink"
                      onClick={() => handleAction(og.clearTechLevels)}
                    >
                      Clear tech
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          </div>
          <div class="overflow-hidden rounded-xl border border-ink/10 bg-white dark:border-white/15 dark:bg-[#22344d] lg:col-start-1 lg:row-start-2">
            <MetricRow label="Total techs" value={og.totalTechLevels()} withBorder={false} />
          </div>
          <div class="overflow-hidden rounded-xl border border-ink/10 bg-white dark:border-white/15 dark:bg-[#22344d] lg:col-start-2 lg:row-span-2">
            <table class="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
              <thead class="bg-mist/80 text-[11px] uppercase tracking-[0.08em] text-ink/70 dark:bg-[#1a2a3f] dark:text-white/70 sm:text-xs">
                <tr>
                  <th class="px-2 py-1.5">Next</th>
                  <th class="px-2 py-1.5">Value</th>
                  <th colSpan={2} class="px-2 py-1.5">
                    Remaining
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={og.topFive()}>
                  {(entry) => (
                    <tr class="border-t border-ink/10 dark:border-white/10">
                      <td class="px-2 py-1 font-semibold text-ink dark:text-white">{`OG${entry.id}`}</td>
                      <td class="px-2 py-1 text-ink/80 dark:text-white/80">
                        {formatPercentFromRatio(entry.relative / 100, 0)}
                      </td>
                      <td colSpan={2} class="px-2 py-1 text-ink/80 dark:text-white/80">
                        {secondsToLabel(entry.etaSeconds)}
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
        <Index each={og.techCardRows()}>
          {(tech) => (
            <article class="rounded-xl border border-ink/15 bg-white p-3 dark:border-white/15 dark:bg-[#23344d]">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-base font-bold text-ink dark:text-white">{tech().label}</p>
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
