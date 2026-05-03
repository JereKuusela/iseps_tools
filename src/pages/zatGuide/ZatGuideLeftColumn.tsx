import { For, Show, createMemo } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { DecimalField, IntegerField, SelectField } from "../../components/ui/formControls"
import type { GuideNodeView, GuideRunType } from "./zatGuideTypes"

type ZatGuideLeftColumnProps = {
  cycles: string
  setCycles: (next: string) => void
  runType: GuideRunType
  setRunType: (next: GuideRunType) => void
  runOptions: { value: GuideRunType; label: string }[]
  techCount: string
  setTechCount: (next: string) => void
  sharesPercent: string
  setSharesPercent: (next: string) => void
  recommendationNodeIds: number[]
  nodeViews: GuideNodeView[]
  selectedNode?: GuideNodeView
  selectedGuideNote?: string
  hasGuide: boolean
}

export const ZatGuideLeftColumn = (props: ZatGuideLeftColumnProps) => {
  const recommendationItems = createMemo(() => {
    const nodesById = new Map(props.nodeViews.map((node) => [node.id, node]))
    const items: { key: string; title: string; level: number; isSingleLevel: boolean }[] = []

    for (const nodeId of props.recommendationNodeIds) {
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
          <IntegerField
            label="Cycles"
            value={props.cycles}
            onInput={props.setCycles}
            min={1}
            max={100}
            step={1}
            inline
          />
          <SelectField
            label="Run type"
            value={props.runType}
            onChange={(next) => props.setRunType(next as GuideRunType)}
            options={props.runOptions}
            inline
          />
        </div>
      </InfoCard>

      <InfoCard title="Guide">
        <Show
          when={props.hasGuide}
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

      <Show when={props.selectedGuideNote}>
        <InfoCard title="Notes">
          <p class="text-sm leading-6 text-ink/80 dark:text-white/80">{props.selectedGuideNote}</p>
        </InfoCard>
      </Show>

      <InfoCard title="Node info">
        <p class="text-sm leading-6 text-ink/75 dark:text-white/75">{props.selectedNode?.info ?? "Select node"}</p>
      </InfoCard>

      <InfoCard title="Total boost">
        <div class="grid gap-2">
          <IntegerField
            label="Tech levels"
            value={props.techCount}
            onInput={props.setTechCount}
            min={0}
            step={1}
            inline
          />
          <DecimalField
            label="Shares %"
            value={props.sharesPercent}
            onInput={props.setSharesPercent}
            min={0}
            max={100}
            step={0.05}
            inline
          />
        </div>
      </InfoCard>
    </>
  )
}
