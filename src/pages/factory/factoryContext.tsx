import { createContext, createMemo, type ParentProps, useContext } from "solid-js"
import { createSyncedSignal } from "../../lib/persistedSignal"
import {
  calculateBuild,
  evaluateNextNodeValues,
  getBuildScore,
  normalizeFactoryInputState,
  normalizeFactoryNodeLevels,
} from "./factoryCalculator"
import { emptyFactoryNodeLevels, type FactoryInputState, type FactoryNodeLevels } from "./factoryTypes"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

type FactoryContextValue = {
  prestigesDone: () => string
  setPrestigesDone: (next: string) => string
  totalParticleLevel: () => string
  setTotalParticleLevel: (next: string) => string
  productionWeightPercent: () => string
  setProductionWeightPercent: (next: string) => string
  particleWeightPercent: () => string
  setParticleWeightPercent: (next: string) => string
  nodeLevels: () => FactoryNodeLevels
  setNodeLevels: (next: FactoryNodeLevels) => void
  setNodeLevel: (id: keyof FactoryNodeLevels, next: number) => void
  totalPoints: () => number
  spentPoints: () => number
  availablePoints: () => number
  evaluationRows: () => ReturnType<typeof evaluateNextNodeValues>["rows"]
  bestNodeId: () => ReturnType<typeof evaluateNextNodeValues>["bestNodeId"]
  optimalLevels: () => FactoryNodeLevels
  isOptimal: () => boolean
  optimality: () => string
  applyNext: () => void
  resetAll: () => void
  applyOptimal: () => void
}

const FactoryContext = createContext<FactoryContextValue>()

const areLevelsEqual = (left: FactoryNodeLevels, right: FactoryNodeLevels) => {
  const normalizedLeft = normalizeFactoryNodeLevels(left)
  const normalizedRight = normalizeFactoryNodeLevels(right)

  return (Object.keys(normalizedLeft) as (keyof FactoryNodeLevels)[]).every(
    (id) => normalizedLeft[id] === normalizedRight[id],
  )
}

const toFactoryInput = (raw: {
  prestigesDone: string
  totalParticleLevel: string
  productionWeightPercent: string
  particleWeightPercent: string
}): FactoryInputState => {
  return normalizeFactoryInputState({
    prestigesDone: parseNumberish(raw.prestigesDone),
    totalParticleLevel: parseNumberish(raw.totalParticleLevel),
    productionWeightPercent: parseNumberish(raw.productionWeightPercent),
    particleWeightPercent: parseNumberish(raw.particleWeightPercent),
  })
}

export const FactoryProvider = (props: ParentProps) => {
  const [prestigesDone, setPrestigesDone] = createSyncedSignal("factory.prestigesDone", "0")
  const [totalParticleLevel, setTotalParticleLevel] = createSyncedSignal("factory.totalParticleLevel", "0")
  const [productionWeightPercent, setProductionWeightPercent] = createSyncedSignal(
    "factory.productionWeightPercent",
    "10",
  )
  const [particleWeightPercent, setParticleWeightPercent] = createSyncedSignal("factory.particleWeightPercent", "0")

  const [nodeLevels, setNodeLevels] = createSyncedSignal<FactoryNodeLevels>(
    "factory.nodeLevels",
    emptyFactoryNodeLevels(),
  )

  const normalizedLevels = createMemo(() => normalizeFactoryNodeLevels(nodeLevels()))

  const normalizedInput = createMemo(() =>
    toFactoryInput({
      prestigesDone: prestigesDone(),
      totalParticleLevel: totalParticleLevel(),
      productionWeightPercent: productionWeightPercent(),
      particleWeightPercent: particleWeightPercent(),
    }),
  )

  const score = createMemo(() => getBuildScore(normalizedInput(), normalizedLevels()))
  const evaluation = createMemo(() => evaluateNextNodeValues(normalizedInput(), normalizedLevels()))
  const optimal = createMemo(() => calculateBuild(normalizedInput(), emptyFactoryNodeLevels()))
  const optimalBuild = createMemo(() => optimal().levels)

  const isOptimal = createMemo(() => areLevelsEqual(normalizedLevels(), optimalBuild()))

  const optimality = createMemo(() => {
    const currentObjective = score()
    const optimalObjective = optimal().score

    if (optimalObjective <= Number.EPSILON) return "100%"

    const rawPercent = (currentObjective / optimalObjective) * 100
    if (!Number.isFinite(rawPercent) || rawPercent < 0.01) return "0%"
    if (rawPercent < 1) return `${rawPercent.toFixed(2)}%`
    if (rawPercent > 999.99) return `${(rawPercent / 100).toFixed(0)}x`
    return `${rawPercent.toFixed(0)}%`
  })

  const setNodeLevel = (id: keyof FactoryNodeLevels, next: number) => {
    setNodeLevels((previous) => {
      const updated = normalizeFactoryNodeLevels(previous)
      updated[id] = Math.max(0, Math.floor(next))
      return normalizeFactoryNodeLevels(updated)
    })
  }

  const replaceNodeLevels = (next: FactoryNodeLevels) => {
    setNodeLevels(normalizeFactoryNodeLevels(next))
  }

  const applyNext = () => {
    const next = evaluation().bestNodeId
    if (next) setNodeLevel(next, (normalizedLevels()[next] || 0) + 1)
  }

  const resetAll = () => replaceNodeLevels(emptyFactoryNodeLevels())
  const applyOptimal = () => replaceNodeLevels(optimalBuild())

  return (
    <FactoryContext.Provider
      value={{
        prestigesDone,
        setPrestigesDone,
        totalParticleLevel,
        setTotalParticleLevel,
        productionWeightPercent,
        setProductionWeightPercent,
        particleWeightPercent,
        setParticleWeightPercent,
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
    </FactoryContext.Provider>
  )
}

export const useFactoryContext = (): FactoryContextValue => {
  const context = useContext(FactoryContext)
  if (!context) {
    throw new Error("useFactoryContext must be used inside FactoryProvider")
  }
  return context
}
