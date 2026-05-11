import { createContext, createMemo, createSignal, type ParentProps, useContext } from "solid-js"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { LargeNumber } from "../../lib/largeNumber"
import { useZatData } from "../../lib/zatContext"
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

type ZatGuideContextValue = {
  cycles: () => string
  setCycles: (next: string) => string
  runType: () => GuideRunType
  setRunType: (next: GuideRunType) => GuideRunType
  runOptions: () => { value: GuideRunType; label: string }[]
  techCount: () => string
  sharesPercent: () => string
  setSharesPercent: (next: string) => string
  recommendationNodeIds: () => number[]
  nodeViews: () => GuideNodeView[]
  selectedNode: () => GuideNodeView | undefined
  selectedNodeId: () => number
  selectNode: (nodeId: number) => void
  selectedGuideNote: () => string | undefined
  hasGuide: () => boolean
}

const ZatGuideContext = createContext<ZatGuideContextValue>()

export const ZatGuideProvider = (props: ParentProps) => {
  const data = useZatData()

  const [cycles, setCycles] = createSyncedSignal("zat.og.cycles", "0")
  const [runType, setRunType] = createSyncedSignal<GuideRunType>("zat.guide.runType", "se_push")
  const [sharesPercent, setSharesPercent] = createSyncedSignal("zat.guide.shares", "0")
  const [ogTechLevels] = createSyncedSignal<number[]>("zat.og.techLevels", [])
  const [selectedNodeId, setSelectedNodeId] = createSignal(0)

  const normalizedCycles = createMemo(() => Math.max(1, Math.floor(parseNumberish(cycles()))))
  const shareAmount = createMemo(() => Math.max(0, parseNumberish(sharesPercent()) / 0.05))
  const totalTechLevels = createMemo(() => {
    const levels = ogTechLevels()
    if (!Array.isArray(levels)) return 0

    return levels.reduce((sum, value) => {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return sum
      return sum + Math.max(0, Math.floor(parsed))
    }, 0)
  })
  const normalizedTechCount = createMemo(() => totalTechLevels())
  const techCount = createMemo(() => String(totalTechLevels()))

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

  const selectNode = (nodeId: number) => {
    if (selectedNodeId() === nodeId) setSelectedNodeId(0)
    else setSelectedNodeId(nodeId)
  }

  return (
    <ZatGuideContext.Provider
      value={{
        cycles,
        setCycles,
        runType,
        setRunType,
        runOptions: () => guideRunOptions,
        techCount,
        sharesPercent,
        setSharesPercent,
        recommendationNodeIds: () => selectedGuide()?.nodes ?? [],
        nodeViews,
        selectedNode,
        selectedNodeId,
        selectNode,
        selectedGuideNote: () => selectedGuide()?.note,
        hasGuide: () => selectedGuide() !== null,
      }}
    >
      {props.children}
    </ZatGuideContext.Provider>
  )
}

export const useZatGuideContext = (): ZatGuideContextValue => {
  const context = useContext(ZatGuideContext)
  if (!context) {
    throw new Error("useZatGuideContext must be used inside ZatGuideProvider")
  }
  return context
}
