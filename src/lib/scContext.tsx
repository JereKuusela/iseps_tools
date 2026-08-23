import { createContext, type ParentProps, useContext } from "solid-js"
import { createSyncedSignal } from "./persistedSignal"
import { getTokenKey, TOKEN_SHARED_KEYS } from "./tokenSharedInputs"
import type { ScGoalType } from "./scCalculator"

export type ScGainUnit = "min" | "hour" | "day"

export type ScGoalPanel = {
  id: number
  goalType: ScGoalType
  customGoal: string
}

type ScContextValue = {
  currentSe: () => string
  setCurrentSe: (next: string) => string
  battery1DcCost: () => string
  setBattery1DcCost: (next: string) => string
  currentDc: () => string
  setCurrentDc: (next: string) => string
  dcGainValue: () => string
  setDcGainValue: (next: string) => string
  dcGainUnit: () => ScGainUnit
  setDcGainUnit: (next: ScGainUnit) => ScGainUnit
  replicatorDays: () => string
  setReplicatorDays: (next: string) => string
  replicatorHours: () => string
  setReplicatorHours: (next: string) => string
  replicatorMinutes: () => string
  setReplicatorMinutes: (next: string) => string
  replicatorTimeEditedAtMs: () => string
  setReplicatorTimeEditedAtMs: (next: string) => string
  retainedDcReplicator: () => string
  setRetainedDcReplicator: (next: string) => string
  retainedSeReplicator: () => string
  setRetainedSeReplicator: (next: string) => string
  timeSkipSmall: () => string
  setTimeSkipSmall: (next: string) => string
  timeSkipMedium: () => string
  setTimeSkipMedium: (next: string) => string
  timeSkipLarge: () => string
  setTimeSkipLarge: (next: string) => string
  onlineHoursPerDay: () => string
  setOnlineHoursPerDay: (next: string) => string
  alphaSuppliesLevel: () => string
  setAlphaSuppliesLevel: (next: string) => string
  futureDcBoostPct: () => string
  setFutureDcBoostPct: (next: string) => string
  futureScBoostPct: () => string
  setFutureScBoostPct: (next: string) => string
  panels: () => ScGoalPanel[]
  setPanelGoal: (panelId: number, goalType: ScGoalType) => void
  setPanelCustomGoal: (panelId: number, customGoal: string) => void
  addPanel: () => void
  removePanel: (panelId: number) => void
}

const ScContext = createContext<ScContextValue>()

const GOAL_ORDER: ScGoalType[] = ["battery1", "battery2", "battery3", "customSc", "customDc"]

const normalizePanels = (panels: ScGoalPanel[]): ScGoalPanel[] => {
  const validPanels = panels.filter((panel) => Number.isFinite(panel.id) && panel.id > 0)
  if (validPanels.length > 0) return validPanels

  return [
    { id: 1, goalType: "battery1", customGoal: "1e120" },
    { id: 2, goalType: "battery2", customGoal: "1e120" },
  ]
}

export const ScProvider = (props: ParentProps) => {
  const [currentSe, setCurrentSe] = createSyncedSignal("sc.currentSe", "102")
  const [battery1DcCost, setBattery1DcCost] = createSyncedSignal("sc.battery1DcCost", "2.7e204")
  const [currentDc, setCurrentDc] = createSyncedSignal("sc.currentDc", "1e204")
  const [dcGainValue, setDcGainValue] = createSyncedSignal("sc.dcGainValue", "1e203")
  const [dcGainUnit, setDcGainUnit] = createSyncedSignal<ScGainUnit>("sc.dcGainUnit", "day")
  const [replicatorDays, setReplicatorDays] = createSyncedSignal("sc.replicatorDays", "0")
  const [replicatorHours, setReplicatorHours] = createSyncedSignal("sc.replicatorHours", "0")
  const [replicatorMinutes, setReplicatorMinutes] = createSyncedSignal("sc.replicatorMinutes", "0")
  const [replicatorTimeEditedAtMs, setReplicatorTimeEditedAtMs] = createSyncedSignal("sc.replicatorTimeEditedAtMs", "")
  const [retainedDcReplicator, setRetainedDcReplicator] = createSyncedSignal("sc.retainedDcReplicator", "1")
  const [retainedSeReplicator, setRetainedSeReplicator] = createSyncedSignal("sc.retainedSeReplicator", "1")
  const [timeSkipSmall, setTimeSkipSmall] = createSyncedSignal("sc.timeSkipSmall", "0")
  const [timeSkipMedium, setTimeSkipMedium] = createSyncedSignal("sc.timeSkipMedium", "0")
  const [timeSkipLarge, setTimeSkipLarge] = createSyncedSignal("sc.timeSkipLarge", "0")
  const [onlineHoursPerDay, setOnlineHoursPerDay] = createSyncedSignal(TOKEN_SHARED_KEYS.onlineHoursPerDay, "10")
  const [alphaSuppliesLevel, setAlphaSuppliesLevel] = createSyncedSignal(getTokenKey("supplies.alpha"), "0")
  const [futureDcBoostPct, setFutureDcBoostPct] = createSyncedSignal("sc.futureDcBoostPct", "0")
  const [futureScBoostPct, setFutureScBoostPct] = createSyncedSignal("sc.futureScBoostPct", "0")
  const [panels, setPanels] = createSyncedSignal<ScGoalPanel[]>("sc.panels", [
    { id: 1, goalType: "battery1", customGoal: "1e120" },
    { id: 2, goalType: "battery2", customGoal: "1e120" },
  ])

  const setPanelGoal = (panelId: number, goalType: ScGoalType) => {
    setPanels((previous) => {
      const current = normalizePanels(previous)
      const panelIndex = current.findIndex((panel) => panel.id === panelId)
      if (panelIndex < 0) return current

      const duplicateIndex = current.findIndex((panel, index) => index !== panelIndex && panel.goalType === goalType)
      const next = current.slice()

      if (duplicateIndex >= 0) {
        const source = next[panelIndex]
        const target = next[duplicateIndex]
        next[panelIndex] = { ...source, goalType: target.goalType, customGoal: target.customGoal }
        next[duplicateIndex] = { ...target, goalType: source.goalType, customGoal: source.customGoal }
        return next
      }

      next[panelIndex] = { ...next[panelIndex], goalType }
      return next
    })
  }

  const setPanelCustomGoal = (panelId: number, customGoal: string) => {
    setPanels((previous) => {
      const current = normalizePanels(previous)
      return current.map((panel) => (panel.id === panelId ? { ...panel, customGoal } : panel))
    })
  }

  const addPanel = () => {
    setPanels((previous) => {
      const current = normalizePanels(previous)
      const usedGoals = new Set(current.map((panel) => panel.goalType))
      const nextGoal = GOAL_ORDER.find((goal) => !usedGoals.has(goal)) ?? "customDc"
      const nextId = current.reduce((maxId, panel) => Math.max(maxId, panel.id), 0) + 1

      return [...current, { id: nextId, goalType: nextGoal, customGoal: "1e120" }]
    })
  }

  const removePanel = (panelId: number) => {
    setPanels((previous) => {
      const current = normalizePanels(previous)
      if (current.length <= 1) return current
      if (current[0]?.id === panelId) return current

      const filtered = current.filter((panel) => panel.id !== panelId)
      return normalizePanels(filtered)
    })
  }

  return (
    <ScContext.Provider
      value={{
        currentSe,
        setCurrentSe,
        battery1DcCost,
        setBattery1DcCost,
        currentDc,
        setCurrentDc,
        dcGainValue,
        setDcGainValue,
        dcGainUnit,
        setDcGainUnit,
        replicatorDays,
        setReplicatorDays,
        replicatorHours,
        setReplicatorHours,
        replicatorMinutes,
        setReplicatorMinutes,
        replicatorTimeEditedAtMs,
        setReplicatorTimeEditedAtMs,
        retainedDcReplicator,
        setRetainedDcReplicator,
        retainedSeReplicator,
        setRetainedSeReplicator,
        timeSkipSmall,
        setTimeSkipSmall,
        timeSkipMedium,
        setTimeSkipMedium,
        timeSkipLarge,
        setTimeSkipLarge,
        onlineHoursPerDay,
        setOnlineHoursPerDay,
        alphaSuppliesLevel,
        setAlphaSuppliesLevel,
        futureDcBoostPct,
        setFutureDcBoostPct,
        futureScBoostPct,
        setFutureScBoostPct,
        panels,
        setPanelGoal,
        setPanelCustomGoal,
        addPanel,
        removePanel,
      }}
    >
      {props.children}
    </ScContext.Provider>
  )
}

export const useScContext = (): ScContextValue => {
  const context = useContext(ScContext)
  if (!context) {
    throw new Error("useScContext must be used inside ScProvider")
  }
  return context
}
