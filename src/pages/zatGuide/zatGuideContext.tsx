import { createContext, createEffect, createMemo, createSignal, type ParentProps, useContext } from "solid-js"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { LargeNumber } from "../../lib/largeNumber"
import { useZatData, ZatGuideEntry } from "../../lib/zatContext"
import type { GuideNodeView, GuideRunType } from "./zatGuideTypes"

const runOptions: { value: GuideRunType; label: string }[] = [
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
  guideOptions: () => { value: string; label: string }[]
  selectedGuideTitle: () => string
  setSelectedGuideTitle: (next: string) => string
  techCount: () => string
  sharesPercent: () => string
  setSharesPercent: (next: string) => string
  nodes: () => GuideNodeView[]
  getNode: (nodeId: string) => GuideNodeView | undefined
  selectedNode: () => GuideNodeView | undefined
  selectNode: (nodeId: string) => void
  selectedGuide: () => ZatGuideEntry | undefined
}

const ZatGuideContext = createContext<ZatGuideContextValue>()

export const ZatGuideProvider = (props: ParentProps) => {
  const data = useZatData()

  const [cycles, setCycles] = createSyncedSignal("zat.og.cycles", "0")
  const [runType, setRunType] = createSyncedSignal<GuideRunType>("zat.guide.runType", "se_push")
  const [selectedGuideTitle, setSelectedGuideTitle] = createSyncedSignal("zat.guide.title", "")
  const [sharesPercent, setSharesPercent] = createSyncedSignal("zat.guide.shares", "0")
  const [ogTechLevels] = createSyncedSignal<number[]>("zat.og.techLevels", [])
  const [selectedNodeId, setSelectedNodeId] = createSignal("")

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

  const availableGuides = createMemo(() =>
    data().zatGuides.filter((entry) => entry.run == runType() && entry.cycle == normalizedCycles()),
  )

  const selectedGuide = createMemo(() => {
    const persistedTitle = selectedGuideTitle()
    const guides = availableGuides()
    return guides.find((entry) => entry.title === persistedTitle) ?? guides[0]
  })

  const guideOptions = createMemo(() => {
    const guides = availableGuides()
    return guides.map((entry, index) => {
      const hasTitle = entry.title.trim().length > 0
      return {
        value: entry.title,
        label: hasTitle ? entry.title : `Guide ${index + 1}`,
      }
    })
  })

  createEffect(() => {
    const selected = selectedGuide()
    if (!selected) return

    if (selectedGuideTitle() !== selected.title) {
      setSelectedGuideTitle(selected.title)
    }
  })

  const nodes = createMemo<GuideNodeView[]>(() => {
    const nodeAmounts = selectedGuide()?.nodes

    const techLevels = normalizedTechCount()
    const shares = shareAmount()

    return data()
      .zatNodes.slice()
      .map((node) => {
        const maxLv = node.maxLv ?? 1
        const rawCount = nodeAmounts?.get(node.id) ?? 0
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

  const nodeMap = createMemo(() => new Map(nodes().map((node) => [node.id, node])))
  const getNode = (nodeId: string) => nodeMap().get(nodeId)

  const selectedNode = createMemo<GuideNodeView | undefined>(() => {
    const nodeId = selectedNodeId()
    if (nodeId == null) return undefined
    return getNode(nodeId)
  })

  const selectNode = (nodeId: string) => {
    if (selectedNodeId() === nodeId) setSelectedNodeId("")
    else setSelectedNodeId(nodeId)
  }

  return (
    <ZatGuideContext.Provider
      value={{
        cycles,
        setCycles,
        runType,
        setRunType,
        runOptions: () => runOptions,
        guideOptions,
        selectedGuideTitle,
        setSelectedGuideTitle,
        techCount,
        sharesPercent,
        setSharesPercent,
        selectedGuide,
        nodes,
        selectedNode,
        selectNode,
        getNode,
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
