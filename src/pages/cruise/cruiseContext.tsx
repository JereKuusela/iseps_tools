import { createContext, createMemo, type ParentProps, useContext } from "solid-js"
import {
  evaluateNextNodeValues,
  normalizeCruiseInputState,
  normalizeCruiseNodeLevels,
  calculateBuild,
} from "./cruiseCalculator"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { emptyCruiseNodeLevels, type CruiseInputState, type CruiseNodeLevels } from "./cruiseTypes"
import { getBuildScore } from "./cruiseScore"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

type CruiseContextValue = {
  prestigesDone: () => string
  setPrestigesDone: (next: string) => string
  cruiseLevel: () => string
  setCruiseLevel: (next: string) => string
  baseTicketPrice: () => string
  setBaseTicketPrice: (next: string) => string
  baseGuestMin: () => string
  setBaseGuestMin: (next: string) => string
  baseGuestMax: () => string
  setBaseGuestMax: (next: string) => string
  baseRoomMin: () => string
  setBaseRoomMin: (next: string) => string
  baseRoomMax: () => string
  setBaseRoomMax: (next: string) => string
  nodeLevels: () => CruiseNodeLevels
  setNodeLevels: (next: CruiseNodeLevels) => void
  setNodeLevel: (id: keyof CruiseNodeLevels, next: number) => void
  totalPoints: () => number
  spentPoints: () => number
  availablePoints: () => number
  evaluationRows: () => ReturnType<typeof evaluateNextNodeValues>["rows"]
  bestNodeId: () => ReturnType<typeof evaluateNextNodeValues>["bestNodeId"]
  optimalLevels: () => CruiseNodeLevels
  isOptimal: () => boolean
  optimality: () => string
  applyNext: () => void
  resetAll: () => void
  applyOptimal: () => void
}

const CruiseContext = createContext<CruiseContextValue>()

const safePow = (base: number, exponent: number) => {
  const safeBase = Math.max(Number.EPSILON, Number.isFinite(base) ? base : 1)
  const safeExponent = Math.max(0, Math.floor(Number.isFinite(exponent) ? exponent : 0))
  return safeBase ** safeExponent
}

const toCruiseInput = (raw: {
  prestigesDone: string
  cruiseLevel: string
  ticketPrice: string
  guestSpendingMin: string
  guestSpendingMax: string
  roomCapacityMin: string
  roomCapacityMax: string
}): CruiseInputState => {
  return normalizeCruiseInputState({
    prestigesDone: parseNumberish(raw.prestigesDone),
    cruiseLevel: parseNumberish(raw.cruiseLevel),
    ticketPrice: parseNumberish(raw.ticketPrice),
    guestSpendingMin: parseNumberish(raw.guestSpendingMin),
    guestSpendingMax: parseNumberish(raw.guestSpendingMax),
    roomCapacityMin: parseNumberish(raw.roomCapacityMin),
    roomCapacityMax: parseNumberish(raw.roomCapacityMax),
  })
}

const areLevelsEqual = (left: CruiseNodeLevels, right: CruiseNodeLevels) => {
  const normalizedLeft = normalizeCruiseNodeLevels(left)
  const normalizedRight = normalizeCruiseNodeLevels(right)

  return (Object.keys(normalizedLeft) as (keyof CruiseNodeLevels)[]).every(
    (id) => normalizedLeft[id] === normalizedRight[id],
  )
}

export const CruiseProvider = (props: ParentProps) => {
  const [prestigesDone, setPrestigesDone] = createSyncedSignal("cruise.prestigesDone", "0")
  const [cruiseLevel, setCruiseLevel] = createSyncedSignal("cruise.cruiseLevel", "1")
  const [baseTicketPrice, setBaseTicketPrice] = createSyncedSignal("cruise.baseTicketPrice", "1")
  const [baseGuestMin, setBaseGuestMin] = createSyncedSignal("cruise.baseGuestMin", "0")
  const [baseGuestMax, setBaseGuestMax] = createSyncedSignal("cruise.baseGuestMax", "0")
  const [baseRoomMin, setBaseRoomMin] = createSyncedSignal("cruise.baseRoomMin", "1")
  const [baseRoomMax, setBaseRoomMax] = createSyncedSignal("cruise.baseRoomMax", "1")

  const [nodeLevels, setNodeLevels] = createSyncedSignal<CruiseNodeLevels>("cruise.nodeLevels", emptyCruiseNodeLevels())

  const normalizedLevels = createMemo(() => normalizeCruiseNodeLevels(nodeLevels()))

  const ticketMultiplier = createMemo(() => safePow(1.4, normalizedLevels().ticketPrice))
  const guestMultiplier = createMemo(() => safePow(1.35, normalizedLevels().guestSpending))

  const normalizedInput = createMemo(() =>
    toCruiseInput({
      prestigesDone: prestigesDone(),
      cruiseLevel: cruiseLevel(),
      ticketPrice: (Math.max(1, parseNumberish(baseTicketPrice())) * ticketMultiplier()).toString(),
      guestSpendingMin: (Math.max(0, parseNumberish(baseGuestMin())) * guestMultiplier()).toString(),
      guestSpendingMax: (Math.max(0, parseNumberish(baseGuestMax())) * guestMultiplier()).toString(),
      roomCapacityMin: Math.max(
        1,
        Math.max(1, parseNumberish(baseRoomMin())) + normalizedLevels().moreSpace,
      ).toString(),
      roomCapacityMax: Math.max(
        1,
        Math.max(1, parseNumberish(baseRoomMax())) + normalizedLevels().moreSpace,
      ).toString(),
    }),
  )

  const score = createMemo(() => getBuildScore(normalizedInput(), normalizedLevels()))
  const recommendedMode = createMemo(() => calculateBuild(normalizedInput(), normalizedLevels()).mode)
  const evaluation = createMemo(() => evaluateNextNodeValues(normalizedInput(), normalizedLevels(), recommendedMode()))
  const optimal = createMemo(() => calculateBuild(normalizedInput(), emptyCruiseNodeLevels()))
  const optimalBuild = createMemo(() => optimal().levels)

  const isOptimal = createMemo(() => areLevelsEqual(normalizedLevels(), optimalBuild()))

  const optimality = createMemo(() => {
    const currentObjective = score()
    const optimalObjective = optimal().score

    if (optimalObjective <= Number.EPSILON) return "100%"

    const rawPercent = (currentObjective / optimalObjective) * 100
    if (!Number.isFinite(rawPercent) || rawPercent < 0.01) return "0%"
    if (rawPercent < 1) return rawPercent.toFixed(2)
    if (rawPercent > 999.99) return `${(rawPercent / 100).toFixed(0)}x`
    return `${rawPercent.toFixed(0)}%`
  })

  const setNodeLevel = (id: keyof CruiseNodeLevels, next: number) => {
    setNodeLevels((previous) => {
      const updated = normalizeCruiseNodeLevels(previous)
      updated[id] = Math.max(0, Math.floor(next))
      return normalizeCruiseNodeLevels(updated)
    })
  }

  const replaceNodeLevels = (next: CruiseNodeLevels) => {
    setNodeLevels(normalizeCruiseNodeLevels(next))
  }

  const applyNext = () => {
    const next = evaluation().bestNodeId
    if (next) setNodeLevel(next, (normalizedLevels()[next] || 0) + 1)
  }

  const resetAll = () => replaceNodeLevels(emptyCruiseNodeLevels())
  const applyOptimal = () => replaceNodeLevels(optimalBuild())

  return (
    <CruiseContext.Provider
      value={{
        prestigesDone,
        setPrestigesDone,
        cruiseLevel,
        setCruiseLevel,
        baseTicketPrice,
        setBaseTicketPrice,
        baseGuestMin,
        setBaseGuestMin,
        baseGuestMax,
        setBaseGuestMax,
        baseRoomMin,
        setBaseRoomMin,
        baseRoomMax,
        setBaseRoomMax,
        nodeLevels,
        setNodeLevels: replaceNodeLevels,
        setNodeLevel,
        totalPoints: () => evaluation().totalPoints,
        spentPoints: () => evaluation().spentPoints,
        availablePoints: () => evaluation().availablePoints,
        evaluationRows: () => evaluation().rows,
        bestNodeId: () => evaluation().bestNodeId,
        optimalLevels: optimalBuild,
        isOptimal,
        optimality,
        applyNext,
        resetAll,
        applyOptimal,
      }}
    >
      {props.children}
    </CruiseContext.Provider>
  )
}

export const useCruiseContext = (): CruiseContextValue => {
  const context = useContext(CruiseContext)
  if (!context) {
    throw new Error("useCruiseContext must be used inside CruiseProvider")
  }
  return context
}
