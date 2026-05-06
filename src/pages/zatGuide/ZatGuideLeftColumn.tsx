import { For, Show, createMemo } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { DecimalField, IntegerField, SelectField } from "../../components/ui/formControls"
import type { GuideRunType } from "./zatGuideTypes"
import { useZatGuideContext } from "./zatGuideContext"

export const ZatGuideLeftColumn = () => {
  const guide = useZatGuideContext()
  const recommendationItems = createMemo(() => {
    const nodesById = new Map(guide.nodeViews().map((node) => [node.id, node]))
    const items: { key: string; title: string; level: number; isSingleLevel: boolean }[] = []

    for (const nodeId of guide.recommendationNodeIds()) {
      const node = nodesById.get(nodeId)
      if (!node) continue

      const detail = node.maxLv === 1 ? "Single level" : `Target level: ${node.activeLevel}`
      const key = `${node.id}-${detail}`
      if (items.some((item) => item.key === key)) continue

      items.push({
        key,
        title: node.name,
        level: node.activeLevel,
        isSingleLevel: node.maxLv === 1,
      })
    }

    return items
  })

  return (
    <>
      <InfoCard>
        <div class="grid gap-2">
          <IntegerField label="Cycles" value={guide.cycles()} onInput={guide.setCycles} min={1} max={100} step={1} />
          <SelectField
            label="Run type"
            value={guide.runType()}
            onChange={(next) => guide.setRunType(next as GuideRunType)}
            options={guide.runOptions()}
          />
        </div>
      </InfoCard>

      <InfoCard title="Guide">
        <Show
          when={guide.hasGuide()}
          fallback={<p class="text-sm text-ink/70 dark:text-white/70">No guide data found for this run type.</p>}
        >
          <div class="space-y-2">
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <For each={recommendationItems()}>
                {(item) => (
                  <div class="flex items-center gap-2 border border-accent/20 bg-accent/[0.07] px-2 py-1.5">
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-bold leading-none text-ink/85 dark:text-white/85">
                      {item.isSingleLevel ? "" : item.level}
                    </span>
                    <p class="truncate text-sm font-semibold text-ink/90 dark:text-white/90">{item.title}</p>
                  </div>
                )}
              </For>
            </div>
            <Show when={recommendationItems().length === 0}>
              <p class="text-sm text-ink/70 dark:text-white/70">No recommended nodes for this cycle.</p>
            </Show>
          </div>
        </Show>
      </InfoCard>

      <Show when={guide.selectedGuideNote()}>
        <InfoCard title="Notes">
          <p class="text-sm leading-6 text-ink/80 dark:text-white/80">{guide.selectedGuideNote()}</p>
        </InfoCard>
      </Show>

      <InfoCard title="Node info">
        <p class="text-sm leading-6 text-ink/75 dark:text-white/75">{guide.selectedNode()?.info ?? "Select node"}</p>
      </InfoCard>

      <InfoCard title="Total boost">
        <div class="grid gap-2">
          <div class="rounded border border-ink/15 bg-white/70 px-3 py-2 text-sm text-ink/85 dark:border-white/20 dark:bg-white/5 dark:text-white/85">
            <span class="font-semibold">Tech levels (OG Tech):</span> {guide.techCount()}
          </div>
          <DecimalField
            label="Shares %"
            value={guide.sharesPercent()}
            onInput={guide.setSharesPercent}
            min={0}
            max={100}
            step={0.05}
          />
        </div>
      </InfoCard>
    </>
  )
}
