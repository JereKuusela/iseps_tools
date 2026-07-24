import {
  FACTORY_NODE_DEFINITIONS,
  emptyFactoryNodeLevels,
  type FactoryInputState,
  type FactoryNodeDefinition,
  type FactoryNodeId,
  type FactoryNodeLevels,
} from "./factoryTypes"

export type FactoryEvaluationRow = {
  id: FactoryNodeId
  label: string
  level: number
  maxLevel: number
  unlocked: boolean
  affordable: boolean
  nextCost: number | null
  nextBonusMultiplier: number
  nextBonusPerPoint: number
  relativeBonusPerPoint: number
}

export type FactoryEvaluationResult = {
  totalPoints: number
  spentPoints: number
  availablePoints: number
  rows: FactoryEvaluationRow[]
  bestNodeId: FactoryNodeId | null
}

type FactoryBuildResult = {
  levels: FactoryNodeLevels
  score: number
}

type WeightProfile = {
  sell: number
  production: number
  particle: number
}

type NodeDefinitionMap = Record<FactoryNodeId, FactoryNodeDefinition>

const NODE_MAP = FACTORY_NODE_DEFINITIONS.reduce((accumulator, definition) => {
  accumulator[definition.id] = definition
  return accumulator
}, {} as NodeDefinitionMap)

for (const definition of FACTORY_NODE_DEFINITIONS) {
  if (definition.costs.length !== definition.maxLevel) {
    throw new Error(`factory_prestige.json node ${definition.id} must define exactly ${definition.maxLevel} costs`)
  }
}

const NODE_IDS: FactoryNodeId[] = FACTORY_NODE_DEFINITIONS.map((definition) => definition.id)

const sanitizeNumber = (value: number, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback
  return value
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const safeLog = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return Number.NEGATIVE_INFINITY
  return Math.log(value)
}

const safePowFromLog = (logValue: number) => {
  if (!Number.isFinite(logValue)) {
    return logValue > 0 ? Number.POSITIVE_INFINITY : 0
  }
  if (logValue >= 700) return Number.POSITIVE_INFINITY
  if (logValue <= -700) return 0
  return Math.exp(logValue)
}

const getPerParticleMultiplier = (particleNodeLevel: number) => {
  if (particleNodeLevel <= 0) return 1
  return 1.011 + (particleNodeLevel - 1) * 0.002
}

const getProductionMultiplier = (levels: FactoryNodeLevels) => {
  const outputMultiplier = 1 + levels.fabricatorOutput
  const cooldownFactor = Math.max(0.05, 1 - levels.fabricatorSpeed * 0.05)
  const speedMultiplier = 1 / cooldownFactor
  return outputMultiplier * speedMultiplier
}

const getWeightProfile = (input: FactoryInputState): WeightProfile => {
  const production = 1 + clamp(input.productionWeightPercent, 0, 50) / 100
  const particle = 1 + clamp(input.particleWeightPercent, -30, 30) / 100

  return {
    sell: 1,
    production,
    particle,
  }
}

const getNodeWeight = (id: FactoryNodeId, weights: WeightProfile) => {
  if (id === "sellValue") return weights.sell
  if (id === "particleOutput") return weights.particle
  if (id === "fabricatorOutput" || id === "fabricatorSpeed") return weights.production
  return 0
}

const getCostFromArray = (costs: number[], level: number) => {
  const index = level - 1
  if (index < 0 || index >= costs.length) return Number.POSITIVE_INFINITY
  return costs[index]
}

export const normalizeFactoryInputState = (raw: FactoryInputState): FactoryInputState => {
  return {
    prestigesDone: Math.max(0, Math.floor(sanitizeNumber(raw.prestigesDone, 0))),
    totalParticleLevel: Math.max(0, Math.floor(sanitizeNumber(raw.totalParticleLevel, 0))),
    productionWeightPercent: clamp(Math.floor(sanitizeNumber(raw.productionWeightPercent, 10)), 0, 50),
    particleWeightPercent: clamp(Math.floor(sanitizeNumber(raw.particleWeightPercent, 0)), -30, 30),
  }
}

export const normalizeFactoryNodeLevels = (levels: FactoryNodeLevels): FactoryNodeLevels => {
  const normalized = emptyFactoryNodeLevels()

  for (const id of NODE_IDS) {
    const maxLevel = NODE_MAP[id].maxLevel
    normalized[id] = clamp(Math.floor(sanitizeNumber(levels[id], 0)), 0, maxLevel)
  }

  return normalized
}

const cloneLevels = (levels: FactoryNodeLevels): FactoryNodeLevels => {
  return {
    fabricatorOutput: levels.fabricatorOutput,
    sellValue: levels.sellValue,
    particleOutput: levels.particleOutput,
    fabricatorSpeed: levels.fabricatorSpeed,
    maxOfflineTimeCap: levels.maxOfflineTimeCap,
  }
}

export const getTotalPointsFromPrestiges = (prestigesDone: number) => {
  const prestiges = Math.max(0, Math.floor(prestigesDone))
  return (prestiges * (prestiges + 1)) / 2
}

export const getNodeCostAtLevel = (id: FactoryNodeId, level: number): number => {
  if (level <= 0) return Number.POSITIVE_INFINITY

  return getCostFromArray(NODE_MAP[id].costs, level)
}

export const getSpentPoints = (levels: FactoryNodeLevels): number => {
  const normalized = normalizeFactoryNodeLevels(levels)

  return NODE_IDS.reduce((total, id) => {
    const level = normalized[id]
    let nodeCost = 0

    for (let current = 1; current <= level; current += 1) {
      nodeCost += getNodeCostAtLevel(id, current)
    }

    return total + nodeCost
  }, 0)
}

export const getAvailablePoints = (input: FactoryInputState, levels: FactoryNodeLevels): number => {
  const normalizedInput = normalizeFactoryInputState(input)
  const total = getTotalPointsFromPrestiges(normalizedInput.prestigesDone)
  return Math.max(0, total - getSpentPoints(levels))
}

const getNodeUnlockState = (_id: FactoryNodeId, _levels: FactoryNodeLevels) => {
  return true
}

const calculateLongTermScore = (bonusMultiplier: number, cost: number) => {
  if (!Number.isFinite(bonusMultiplier) || bonusMultiplier <= 0) return 0
  if (!Number.isFinite(cost) || cost <= 0) return 0

  const logBonus = safeLog(bonusMultiplier)
  if (!Number.isFinite(logBonus) || logBonus <= 0) return 0
  return logBonus / cost
}

const getParticleMultiplierRatio = (currentLevel: number, nextLevel: number, totalParticleLevel: number) => {
  if (totalParticleLevel <= 0) return 1

  const currentPerParticle = getPerParticleMultiplier(currentLevel)
  const nextPerParticle = getPerParticleMultiplier(nextLevel)
  const ratioPerParticle = nextPerParticle / Math.max(currentPerParticle, Number.EPSILON)

  return safePowFromLog(safeLog(ratioPerParticle) * totalParticleLevel)
}

const evaluateNodeScore = (
  input: FactoryInputState,
  levels: FactoryNodeLevels,
  id: FactoryNodeId,
): { nextBonusMultiplier: number; nextBonusPerPoint: number } => {
  const nextLevel = levels[id] + 1
  const nextCost = getNodeCostAtLevel(id, nextLevel)
  const weights = getWeightProfile(input)

  let nextBonusMultiplier = 1

  if (id === "fabricatorOutput") {
    nextBonusMultiplier = (levels.fabricatorOutput + 2) / (levels.fabricatorOutput + 1)
  } else if (id === "sellValue") {
    nextBonusMultiplier = 1.5
  } else if (id === "particleOutput") {
    nextBonusMultiplier = getParticleMultiplierRatio(levels.particleOutput, nextLevel, input.totalParticleLevel)
  } else if (id === "fabricatorSpeed") {
    const currentCooldownFactor = Math.max(0.05, 1 - levels.fabricatorSpeed * 0.05)
    const nextCooldownFactor = Math.max(0.05, 1 - nextLevel * 0.05)
    nextBonusMultiplier = currentCooldownFactor / nextCooldownFactor
  }

  const weight = getNodeWeight(id, weights)
  const weightedMultiplier = safePowFromLog(safeLog(nextBonusMultiplier) * weight)
  const nextBonusPerPoint = calculateLongTermScore(weightedMultiplier, nextCost)

  return { nextBonusMultiplier, nextBonusPerPoint }
}

const evaluateNode = (
  id: FactoryNodeId,
  input: FactoryInputState,
  levels: FactoryNodeLevels,
  availablePoints: number,
): FactoryEvaluationRow => {
  const definition = NODE_MAP[id]
  const level = levels[id]
  const unlocked = getNodeUnlockState(id, levels)
  const canLevel = level < definition.maxLevel

  const nextCost = canLevel ? getNodeCostAtLevel(id, level + 1) : null
  const affordable = Boolean(unlocked && nextCost !== null && nextCost <= availablePoints)

  if (!unlocked || !canLevel || nextCost === null) {
    return {
      id,
      label: definition.label,
      level,
      maxLevel: definition.maxLevel,
      unlocked,
      affordable,
      nextCost,
      nextBonusMultiplier: 1,
      nextBonusPerPoint: 0,
      relativeBonusPerPoint: 0,
    }
  }

  const score = evaluateNodeScore(input, levels, id)

  return {
    id,
    label: definition.label,
    level,
    maxLevel: definition.maxLevel,
    unlocked,
    affordable,
    nextCost,
    nextBonusMultiplier: score.nextBonusMultiplier,
    nextBonusPerPoint: score.nextBonusPerPoint,
    relativeBonusPerPoint: 0,
  }
}

export const evaluateNextNodeValues = (
  input: FactoryInputState,
  levels: FactoryNodeLevels,
): FactoryEvaluationResult => {
  const normalizedInput = normalizeFactoryInputState(input)
  const normalizedLevels = normalizeFactoryNodeLevels(levels)

  const totalPoints = getTotalPointsFromPrestiges(normalizedInput.prestigesDone)
  const spentPoints = getSpentPoints(normalizedLevels)
  const availablePoints = Math.max(0, totalPoints - spentPoints)

  const rows = NODE_IDS.map((id) => evaluateNode(id, normalizedInput, normalizedLevels, availablePoints))

  const maxBonusPerPoint = Math.max(
    ...rows.filter((row) => row.unlocked && row.nextCost !== null).map((row) => row.nextBonusPerPoint),
    0,
  )

  if (maxBonusPerPoint > 0) {
    for (const row of rows) {
      if (row.unlocked && row.nextCost !== null) {
        row.relativeBonusPerPoint = row.nextBonusPerPoint / maxBonusPerPoint
      }
    }
  }

  const bestNode = rows
    .filter((row) => row.affordable && row.nextBonusPerPoint > 0)
    .slice()
    .sort((a, b) => {
      if (b.nextBonusPerPoint !== a.nextBonusPerPoint) return b.nextBonusPerPoint - a.nextBonusPerPoint
      if ((a.nextCost ?? Number.POSITIVE_INFINITY) !== (b.nextCost ?? Number.POSITIVE_INFINITY)) {
        return (a.nextCost ?? Number.POSITIVE_INFINITY) - (b.nextCost ?? Number.POSITIVE_INFINITY)
      }
      return a.id.localeCompare(b.id)
    })[0]

  return {
    totalPoints,
    spentPoints,
    availablePoints,
    rows,
    bestNodeId: bestNode?.id ?? null,
  }
}

const calculateNext = (input: FactoryInputState, levels: FactoryNodeLevels) => {
  const evaluation = evaluateNextNodeValues(input, levels)
  const bestNodeId = evaluation.bestNodeId

  if (!bestNodeId) return false

  const row = evaluation.rows.find((entry) => entry.id === bestNodeId)
  if (!row?.nextCost) return false
  if (row.nextBonusPerPoint <= 0) return false

  levels[bestNodeId] = Math.min(NODE_MAP[bestNodeId].maxLevel, levels[bestNodeId] + 1)
  return true
}

export const getBuildScore = (input: FactoryInputState, levels: FactoryNodeLevels) => {
  const normalizedInput = normalizeFactoryInputState(input)
  const normalizedLevels = normalizeFactoryNodeLevels(levels)
  const weights = getWeightProfile(normalizedInput)

  const sellLog = normalizedLevels.sellValue * Math.log(1.5)
  const productionLog = safeLog(getProductionMultiplier(normalizedLevels))

  const perParticleMultiplier = getPerParticleMultiplier(normalizedLevels.particleOutput)
  const particleLog = normalizedInput.totalParticleLevel * safeLog(perParticleMultiplier)

  const weightedLog = weights.sell * sellLog + weights.production * productionLog + weights.particle * particleLog
  if (!Number.isFinite(weightedLog)) return 0

  // Return objective on multiplier scale instead of compressed log scale
  // so optimality percentages reflect meaningful build differences.
  return Math.max(0, safePowFromLog(weightedLog))
}

export const calculateBuild = (input: FactoryInputState, levels: FactoryNodeLevels): FactoryBuildResult => {
  const normalizedInput = normalizeFactoryInputState(input)
  const currentLevels = cloneLevels(normalizeFactoryNodeLevels(levels))

  let iterations = 0
  while (iterations < 10000) {
    iterations += 1
    const bought = calculateNext(normalizedInput, currentLevels)
    if (!bought) break
  }

  return {
    levels: currentLevels,
    score: getBuildScore(normalizedInput, currentLevels),
  }
}
