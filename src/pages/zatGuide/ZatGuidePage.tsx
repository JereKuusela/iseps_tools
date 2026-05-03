import { createMemo, createSignal } from "solid-js"
import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { createPersistedSignal } from "../../lib/persistedSignal"
import { LargeNumber } from "../../lib/largeNumber"
import { useZatData } from "../../lib/zatContext"
import { ZatGuideLeftColumn } from "./ZatGuideLeftColumn"
import { ZatGuideRightColumn } from "./ZatGuideRightColumn"
import type { GuideEntry, GuideNodeView, GuideRunType } from "./zatGuideTypes"

const guideRunOptions: { value: GuideRunType; label: string }[] = [
  { value: "se_push", label: "SE Push" },
  { value: "g_points", label: "G-Points" },
  { value: "juno", label: "Juno" },
  { value: "cash", label: "Cash" },
]

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

export const ZatGuidePage = (props: { cycles: string; setCycles: (next: string) => void }) => {
  const data = useZatData()

  const [runType, setRunType] = createPersistedSignal<GuideRunType>("zat.guide.runType", "se_push")
  const [sharesPercent, setSharesPercent] = createPersistedSignal("zat.guide.shares", "0")
  const [techCount, setTechCount] = createPersistedSignal("zat.guide.techCount", "0")
  const [selectedNodeId, setSelectedNodeId] = createSignal(0)

  const normalizedCycles = createMemo(() => Math.max(1, Math.floor(parseNumberish(props.cycles))))
  const shareAmount = createMemo(() => Math.max(0, parseNumberish(sharesPercent()) / 0.05))
  const normalizedTechCount = createMemo(() => Math.max(0, Math.floor(parseNumberish(techCount()))))

  const runGuides = createMemo(() => {
    return (data().zatGuides as GuideEntry[])
      .filter((entry) => entry.run === runType())
      .sort((a, b) => a.cycle - b.cycle)
  })

  const selectedGuide = createMemo<GuideEntry | null>(() => {
    const guides = runGuides()
    if (guides.length === 0) return null

    const targetCycle = normalizedCycles()
    let selected = guides[0]

    for (const entry of guides) {
      if (entry.cycle > targetCycle) break
      selected = entry
    }

    return selected
  })

  const nodeViews = createMemo<GuideNodeView[]>(() => {
    const counts = new Map<number, number>()
    for (const nodeId of selectedGuide()?.nodes ?? []) {
      counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1)
    }

    const techLevels = normalizedTechCount()
    const shares = shareAmount()

    return data()
      .zatNodes.slice()
      .sort((a, b) => a.id - b.id)
      .map((node) => {
        const maxLv = node.maxLv ?? 1
        const rawCount = counts.get(node.id) ?? 0
        const activeLevel = Math.min(rawCount, maxLv)
        const isSingleLevel = maxLv === 1

        const techBase = 1 + activeLevel * node.techMul
        let boost = LargeNumber.from(techBase).powInt(techLevels)
        if (node.shareMul) {
          const shareBoost = 1 + node.shareMul
          boost = boost.multiply(shareBoost ** shares)
        }

        return {
          id: node.id,
          name: node.name,
          info: node.info,
          x: node.x,
          y: node.y,
          req: node.req,
          maxLv,
          activeLevel,
          boost,
          isSingleLevel,
        }
      })
  })

  const selectedNode = createMemo<GuideNodeView | undefined>(() => {
    const nodeId = selectedNodeId()
    if (nodeId == null) return undefined
    return nodeViews().find((node) => node.id == nodeId)
  })

  return (
    <Panel title="ZAT Guide" tooltip="zatGuide.panel">
      <SplitColumns
        layoutClass="xl:grid-cols-[0.92fr_1fr]"
        right={
          <ZatGuideRightColumn
            nodeViews={nodeViews()}
            selectedNodeId={selectedNodeId()}
            onSelectNode={setSelectedNodeId}
          />
        }
      >
        <ZatGuideLeftColumn
          cycles={props.cycles}
          setCycles={props.setCycles}
          runType={runType()}
          setRunType={setRunType}
          runOptions={guideRunOptions}
          techCount={techCount()}
          setTechCount={setTechCount}
          sharesPercent={sharesPercent()}
          setSharesPercent={setSharesPercent}
          recommendationNodeIds={selectedGuide()?.nodes ?? []}
          nodeViews={nodeViews()}
          selectedNode={selectedNode()}
          selectedGuideNote={selectedGuide()?.note}
          hasGuide={selectedGuide() !== null}
        />
      </SplitColumns>
    </Panel>
  )
}
