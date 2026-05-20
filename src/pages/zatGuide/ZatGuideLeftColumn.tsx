import { For, Show, createMemo } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { DecimalField, IntegerField, SelectField } from "../../components/ui/formControls"
import type { GuideRunType } from "./zatGuideTypes"
import { useZatGuideContext } from "./zatGuideContext"
import { formatLargeNumberMultiplier } from "../../lib/numberFormat"

export const ZatGuideLeftColumn = () => {
  const { cycles, setCycles, runType, setRunType, runOptions, techCount, sharesPercent, setSharesPercent } =
    useZatGuideContext()
  const { selectedGuide, selectedNode, getNode } = useZatGuideContext()

  const items = createMemo(() => {
    return Array.from(selectedGuide()?.nodes.entries() ?? []).map(([nodeId, amount]) => {
      const node = getNode(nodeId)

      if (!node)
        return {
          id: nodeId,
          title: `Unknown node ${nodeId}`,
          level: "",
        }
      return {
        id: nodeId,
        title: node.name,
        level: node.maxLv == 1 ? "" : amount.toString(),
      }
    })
  })

  const nodeInfo = () => {
    const node = selectedNode()
    if (!node) return "Select node"
    return `${node.info}\n\nTotal boost: ${formatLargeNumberMultiplier(node.boost)}`
  }

  return (
    <>
      <InfoCard>
        <div class="grid gap-2">
          <IntegerField label="Cycles" value={cycles()} onInput={setCycles} min={1} max={100} step={1} />
          <SelectField
            label="Run type"
            value={runType()}
            onChange={(next) => setRunType(next as GuideRunType)}
            options={runOptions()}
          />
        </div>
      </InfoCard>

      <InfoCard title="Guide">
        <Show
          when={selectedGuide()}
          fallback={<p class="text-sm text-ink/70 dark:text-white/70">No guide data found for this run type.</p>}
        >
          <div class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <For each={items()}>
                {(item) => (
                  <div class="flex items-center gap-2 border border-accent/20 bg-accent/[0.07] px-2 py-1.5">
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-bold leading-none text-ink/85 dark:text-white/85">
                      {item.level}
                    </span>
                    <p class="truncate text-sm font-semibold text-ink/90 dark:text-white/90">{item.title}</p>
                  </div>
                )}
              </For>
            </div>
            <Show when={items().length === 0}>
              <p class="text-sm text-ink/70 dark:text-white/70">No recommended nodes for this cycle.</p>
            </Show>
          </div>
        </Show>
      </InfoCard>

      <Show when={selectedGuide()?.note}>
        <InfoCard title="Notes">
          <p class="text-sm leading-6 text-ink/80 dark:text-white/80">{selectedGuide()?.note}</p>
        </InfoCard>
      </Show>

      <InfoCard title="Node info">
        <p class="text-sm leading-6 text-ink/75 dark:text-white/75 whitespace-pre-wrap">{nodeInfo()}</p>
      </InfoCard>

      <InfoCard title="Total boost">
        <div class="grid gap-2">
          <div class="rounded border border-ink/15 bg-white/70 px-3 py-2 text-sm text-ink/85 dark:border-white/20 dark:bg-white/5 dark:text-white/85">
            <span class="font-semibold">Tech levels (OG Tech):</span> {techCount()}
          </div>
          <DecimalField
            label="Shares %"
            value={sharesPercent()}
            onInput={setSharesPercent}
            min={0}
            max={100}
            step={0.05}
          />
        </div>
      </InfoCard>
    </>
  )
}
