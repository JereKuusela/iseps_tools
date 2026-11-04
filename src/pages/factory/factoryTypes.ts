import factoryPrestigeJson from "../../../data/factory_prestige.json"

export type FactoryNodeId =
  | "fabricatorOutput"
  | "sellValue"
  | "particleOutput"
  | "fabricatorSpeed"
  | "maxOfflineTimeCap"

export type FactoryNodeLevels = Record<FactoryNodeId, number>

export type FactoryInputState = {
  prestigesDone: number
  totalParticleLevel: number
  productionWeightPercent: number
  particleWeightMultiplier: number
}

export type FactoryNodeDefinition = {
  id: FactoryNodeId
  label: string
  maxLevel: number
  costs: number[]
}

export const FACTORY_NODE_DEFINITIONS: FactoryNodeDefinition[] = factoryPrestigeJson as FactoryNodeDefinition[]

export const emptyFactoryNodeLevels = (): FactoryNodeLevels => {
  return Object.fromEntries(FACTORY_NODE_DEFINITIONS.map((definition) => [definition.id, 0])) as FactoryNodeLevels
}

export const PARTICLE_WEIGHT_OPTIONS = [
  { value: "0.125", label: "1/8x" },
  { value: "0.25", label: "1/4x" },
  { value: "0.5", label: "1/2x" },
  { value: "1", label: "1x" },
  { value: "2", label: "2x" },
  { value: "4", label: "4x" },
  { value: "8", label: "8x" },
]
