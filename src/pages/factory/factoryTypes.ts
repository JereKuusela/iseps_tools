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
  particleWeightPercent: number
}

export type FactoryNodeDefinition = {
  id: FactoryNodeId
  label: string
  maxLevel: number
  unlockRequiresFabricatorLevel?: number
  costs: number[]
}

export const FACTORY_NODE_DEFINITIONS: FactoryNodeDefinition[] = factoryPrestigeJson as FactoryNodeDefinition[]

export const emptyFactoryNodeLevels = (): FactoryNodeLevels => {
  return Object.fromEntries(FACTORY_NODE_DEFINITIONS.map((definition) => [definition.id, 0])) as FactoryNodeLevels
}
