import { For, Index, Show, createMemo } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { formatCompactMultiplier, formatPercentFromRatio } from "../../lib/numberFormat"
import { useCruiseContext } from "./cruiseContext"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

export const CruiseRightColumn = () => {
  const cruise = useCruiseContext()

  const bestRow = createMemo(() => {
    const winner = cruise.bestNodeId()
    if (!winner) return null
    return cruise.evaluationRows().find((row) => row.id === winner) ?? null
  })

  const optimalLevels = createMemo(() => cruise.optimalLevels())
  const showOptimalColumn = () => !cruise.isOptimal()
  const optimalityPercentLabel = createMemo(() => `${cruise.currentOptimalityPercent().toFixed(0)}% optimal.`)
  return (
    <div class="grid gap-3">
      <div class="overflow-hidden rounded-xl border border-ink/10 bg-white dark:border-white/15 dark:bg-[#22344d]">
        <div class="space-y-2 border-b border-ink/10 px-2.5 py-2 dark:border-white/10">
          <p class="text-xs font-semibold text-ink/80 dark:text-white/80">Your build is {optimalityPercentLabel()}</p>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              class="rounded-lg border border-ink/25 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/85 transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
              onClick={cruise.applyNext}
              disabled={!bestRow() || !bestRow()!.affordable}
              title="Buy next best"
            >
              Buy next
            </button>
            <button
              type="button"
              class="rounded-lg border border-ink/25 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/85 transition hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
              onClick={cruise.applyOptimal}
              disabled={!showOptimalColumn()}
              title="Apply optimal build"
            >
              Apply optimal
            </button>
            <button
              type="button"
              class="rounded-lg border border-ink/25 bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink/85 transition hover:bg-ink hover:text-white dark:border-white/30 dark:bg-[#1f3047] dark:text-white/85 dark:hover:bg-white dark:hover:text-ink"
              onClick={cruise.resetAll}
              title="Reset all nodes"
            >
              Reset
            </button>
          </div>
        </div>
        <table class="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
          <thead class="bg-mist/80 text-[11px] uppercase tracking-[0.08em] text-ink/70 dark:bg-[#1a2a3f] dark:text-white/70 sm:text-xs">
            <tr>
              <th class="px-2 py-1.5" colSpan={2}>
                Node
              </th>
              <Show when={showOptimalColumn()}>
                <th class="px-2 py-1.5">Optimal</th>
              </Show>
              <th class="px-2 py-1.5">Cost</th>
              <th class="px-2 py-1.5 max-[400px]:hidden">Bonus</th>
              <th class="px-2 py-1.5">Value</th>
            </tr>
          </thead>
          <tbody>
            <Index each={cruise.evaluationRows()}>
              {(row) => (
                <tr
                  class="border-t border-ink/10 dark:border-white/10"
                  classList={{
                    "bg-[#12a89d]/10 dark:bg-[#8ce3ff]/10": cruise.bestNodeId() === row().id && row().affordable,
                    "opacity-55": !row().unlocked,
                  }}
                >
                  <td class="px-2 py-1 font-semibold text-ink dark:text-white">{row().label}</td>
                  <td class="px-2 py-1">
                    <input
                      type="number"
                      value={String(row().level)}
                      min={0}
                      max={row().maxLevel}
                      step={1}
                      disabled={!row().unlocked}
                      onInput={(event) =>
                        cruise.setNodeLevel(row().id, Math.floor(parseNumberish(event.currentTarget.value)))
                      }
                      class="w-12 rounded border border-ink/20 bg-white px-1.5 py-0.5 text-right text-xs font-medium text-ink outline-none ring-brand/40 transition focus:ring disabled:cursor-not-allowed disabled:bg-ink/5 dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
                    />
                  </td>
                  <Show when={showOptimalColumn()}>
                    <td class="px-2 py-1">
                      <div class="w-14 px-1.5 py-0.5 text-xs font-medium text-ink/85 dark:text-white/85">
                        {optimalLevels()[row().id]}
                      </div>
                    </td>
                  </Show>
                  <td class="px-2 py-1 text-ink/80 dark:text-white/80">
                    {row().nextCost !== null && row().nextBonusPerPoint > 0 ? row().nextCost : "-"}
                  </td>
                  <td class="px-2 py-1 text-ink/80 dark:text-white/80 max-[400px]:hidden">
                    {row().nextCost !== null && row().nextBonusPerPoint > 0
                      ? formatCompactMultiplier(row().nextBonusMultiplier)
                      : "-"}
                  </td>
                  <td class="px-2 py-1 text-ink/80 dark:text-white/80">
                    {row().nextCost !== null && row().nextBonusPerPoint > 0
                      ? formatPercentFromRatio(row().relativeBonusPerPoint, 0)
                      : "-"}
                  </td>
                </tr>
              )}
            </Index>
          </tbody>
        </table>
      </div>
    </div>
  )
}
