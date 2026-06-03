import { createContext, createMemo, type ParentProps, useContext } from "solid-js"
import {
  applyActionBuyNext,
  applyActionOptimize,
  applyActionSpendAll,
  applyActionResetAll,
  evaluateNextNodeValues,
  getCruiseSnapshot,
  normalizeCruiseInputState,
  normalizeCruiseNodeLevels,
} from "../../lib/cruiseCalculator"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { emptyCruiseNodeLevels, type CruiseInputState, type CruiseNodeLevels } from "./cruiseTypes"

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
  baseSnapshot: () => ReturnType<typeof getCruiseSnapshot>
  evaluationRows: () => ReturnType<typeof evaluateNextNodeValues>["rows"]
  bestNodeId: () => ReturnType<typeof evaluateNextNodeValues>["bestNodeId"]
  recommendedNodeLevels: () => CruiseNodeLevels
  optimalNodeLevels: () => CruiseNodeLevels
  recommendedDiffersFromCurrent: () => boolean
  optimalDiffersFromCurrent: () => boolean
  optimalDiffersFromRecommended: () => boolean
  currentOptimalityPercent: () => number
  buyNextBest: () => void
  spendAll: () => void
  resetAll: () => void
  optimize: () => void
  applyRecommended: () => void
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

  // Base input without any node effects - used for optimal calculation
  const baseInputWithoutNodes = createMemo(() =>
    toCruiseInput({
      prestigesDone: prestigesDone(),
      cruiseLevel: cruiseLevel(),
      ticketPrice: Math.max(1, parseNumberish(baseTicketPrice())).toString(),
      guestSpendingMin: Math.max(0, parseNumberish(baseGuestMin())).toString(),
      guestSpendingMax: Math.max(0, parseNumberish(baseGuestMax())).toString(),
      roomCapacityMin: Math.max(1, Math.max(1, parseNumberish(baseRoomMin()))).toString(),
      roomCapacityMax: Math.max(1, Math.max(1, parseNumberish(baseRoomMax()))).toString(),
    }),
  )

  const evaluation = createMemo(() => evaluateNextNodeValues(normalizedInput(), normalizedLevels()))
  const baseSnapshot = createMemo(() => getCruiseSnapshot(normalizedInput(), normalizedLevels()))
  const recommendedNodeLevels = createMemo(() => applyActionSpendAll(normalizedInput(), normalizedLevels()).nextLevels)
  const optimalNodeLevels = createMemo(() => applyActionOptimize(baseInputWithoutNodes()).nextLevels)

  const recommendedDiffersFromCurrent = createMemo(() => !areLevelsEqual(normalizedLevels(), recommendedNodeLevels()))
  const optimalDiffersFromCurrent = createMemo(() => !areLevelsEqual(normalizedLevels(), optimalNodeLevels()))
  const optimalDiffersFromRecommended = createMemo(() => !areLevelsEqual(recommendedNodeLevels(), optimalNodeLevels()))

  const currentOptimalityPercent = createMemo(() => {
    const currentObjective = getCruiseSnapshot(normalizedInput(), normalizedLevels()).objectiveMultiplier - 1
    const optimalObjective = getCruiseSnapshot(normalizedInput(), optimalNodeLevels()).objectiveMultiplier - 1

    if (optimalObjective <= Number.EPSILON) return 100

    const rawPercent = (currentObjective / optimalObjective) * 100
    if (!Number.isFinite(rawPercent)) return 0
    return rawPercent
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

  const buyNextBest = () => {
    const result = applyActionBuyNext(normalizedInput(), normalizedLevels())
    replaceNodeLevels(result.nextLevels)
  }

  const spendAll = () => {
    const result = applyActionSpendAll(normalizedInput(), normalizedLevels())
    replaceNodeLevels(result.nextLevels)
  }

  const resetAll = () => {
    replaceNodeLevels(applyActionResetAll())
  }

  const optimize = () => {
    const result = applyActionOptimize(normalizedInput())
    replaceNodeLevels(result.nextLevels)
  }

  const applyRecommended = () => {
    replaceNodeLevels(recommendedNodeLevels())
  }

  const applyOptimal = () => {
    replaceNodeLevels(optimalNodeLevels())
  }

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
        baseSnapshot,
        evaluationRows: () => evaluation().rows,
        bestNodeId: () => evaluation().bestNodeId,
        recommendedNodeLevels,
        optimalNodeLevels,
        recommendedDiffersFromCurrent,
        optimalDiffersFromCurrent,
        optimalDiffersFromRecommended,
        currentOptimalityPercent,
        buyNextBest,
        spendAll,
        resetAll,
        optimize,
        applyRecommended,
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
