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

const PARTICLE_WEIGHT_MULTIPLIERS = [0.125, 0.25, 0.5, 1, 2, 4, 8] as const
const BUILD_ITERATION_LIMIT = 10000
const HYBRID_TARGET_NODE_IDS = ["fabricatorSpeed", "particleOutput"] as const

type HybridTargetNodeId = (typeof HYBRID_TARGET_NODE_IDS)[number]
type HybridTargetLevels = Pick<FactoryNodeLevels, HybridTargetNodeId>

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

const snapToParticleWeightMultiplier = (value: number) => {
  return PARTICLE_WEIGHT_MULTIPLIERS.reduce((nearest, candidate) => {
    return Math.abs(candidate - value) < Math.abs(nearest - value) ? candidate : nearest
  }, PARTICLE_WEIGHT_MULTIPLIERS[0])
}

const normalizeParticleWeightMultiplier = (raw: number) => {
  const value = sanitizeNumber(raw, 1)

  if (PARTICLE_WEIGHT_MULTIPLIERS.some((candidate) => candidate === value)) {
    return value
  }

  // Backward compatibility for saved percent values from older builds.
  if (value >= -30 && value <= 30) {
    return snapToParticleWeightMultiplier(1 + value / 100)
  }

  return snapToParticleWeightMultiplier(value)
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
  const particle = normalizeParticleWeightMultiplier(input.particleWeightMultiplier)

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
    particleWeightMultiplier: normalizeParticleWeightMultiplier(raw.particleWeightMultiplier),
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

const getNodeBonusMultiplier = (input: FactoryInputState, levels: FactoryNodeLevels, id: FactoryNodeId) => {
  const nextLevel = levels[id] + 1

  if (id === "fabricatorOutput") {
    return (levels.fabricatorOutput + 2) / (levels.fabricatorOutput + 1)
  }
  if (id === "sellValue") {
    return 1.5
  }
  if (id === "particleOutput") {
    return getParticleMultiplierRatio(levels.particleOutput, nextLevel, input.totalParticleLevel)
  }
  if (id === "fabricatorSpeed") {
    const currentCooldownFactor = Math.max(0.05, 1 - levels.fabricatorSpeed * 0.05)
    const nextCooldownFactor = Math.max(0.05, 1 - nextLevel * 0.05)
    return currentCooldownFactor / nextCooldownFactor
  }

  return 1
}

const getSpendHorizonCost = (levels: FactoryNodeLevels, availablePoints: number) => {
  const candidateCosts: number[] = []

  for (const id of NODE_IDS) {
    const definition = NODE_MAP[id]
    const level = levels[id]
    if (level >= definition.maxLevel) continue
    if (id === "maxOfflineTimeCap") continue

    const nextCost = getNodeCostAtLevel(id, level + 1)
    if (!Number.isFinite(nextCost) || nextCost <= 0 || nextCost > availablePoints) continue

    candidateCosts.push(nextCost)
  }

  if (candidateCosts.length === 0) return 0
  candidateCosts.sort((a, b) => a - b)

  // Use the second-cheapest meaningful option when possible to avoid
  // both extreme short-horizon and extreme long-horizon bias.
  return candidateCosts[Math.min(1, candidateCosts.length - 1)]
}

const evaluateNodeScore = (
  input: FactoryInputState,
  levels: FactoryNodeLevels,
  id: FactoryNodeId,
  spendHorizonCost: number,
): { nextBonusMultiplier: number; nextBonusPerPoint: number } => {
  const nextLevel = levels[id] + 1
  const nextCost = getNodeCostAtLevel(id, nextLevel)
  const weights = getWeightProfile(input)
  const nextBonusMultiplier = getNodeBonusMultiplier(input, levels, id)
  const nodeWeight = getNodeWeight(id, weights)
  const horizon = Math.max(nextCost, spendHorizonCost)

  let simulatedLevels = cloneLevels(levels)
  let spent = 0
  let totalWeightedLogBonus = 0
  let iterations = 0

  while (spent < horizon && iterations < 1000) {
    iterations += 1
    const simulationNextLevel = simulatedLevels[id] + 1
    const simulationCost = getNodeCostAtLevel(id, simulationNextLevel)

    if (!Number.isFinite(simulationCost) || simulationCost <= 0 || spent + simulationCost > horizon) break

    const simulationMultiplier = getNodeBonusMultiplier(input, simulatedLevels, id)
    const weightedLogBonus = safeLog(simulationMultiplier) * nodeWeight
    if (!Number.isFinite(weightedLogBonus) || weightedLogBonus <= 0) break

    spent += simulationCost
    totalWeightedLogBonus += weightedLogBonus
    simulatedLevels[id] = simulationNextLevel
  }

  let nextBonusPerPoint = 0
  if (horizon > 0) {
    const sustainedMultiplier = safePowFromLog(totalWeightedLogBonus)
    nextBonusPerPoint = calculateLongTermScore(sustainedMultiplier, horizon)
  }

  return { nextBonusMultiplier, nextBonusPerPoint }
}

const evaluateNode = (
  id: FactoryNodeId,
  input: FactoryInputState,
  levels: FactoryNodeLevels,
  availablePoints: number,
  spendHorizonCost: number,
): FactoryEvaluationRow => {
  const definition = NODE_MAP[id]
  const level = levels[id]
  const canLevel = level < definition.maxLevel

  const nextCost = canLevel ? getNodeCostAtLevel(id, level + 1) : null
  const affordable = Boolean(nextCost !== null && nextCost <= availablePoints)

  if (!canLevel || nextCost === null) {
    return {
      id,
      label: definition.label,
      level,
      maxLevel: definition.maxLevel,
      unlocked: true,
      affordable,
      nextCost,
      nextBonusMultiplier: 1,
      nextBonusPerPoint: 0,
      relativeBonusPerPoint: 0,
    }
  }

  const score = evaluateNodeScore(input, levels, id, spendHorizonCost)

  return {
    id,
    label: definition.label,
    level,
    maxLevel: definition.maxLevel,
    unlocked: true,
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

  const spendHorizonCost = getSpendHorizonCost(normalizedLevels, availablePoints)

  const rows = NODE_IDS.map((id) =>
    evaluateNode(id, normalizedInput, normalizedLevels, availablePoints, spendHorizonCost),
  )

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

const fillGreedyBuild = (input: FactoryInputState, levels: FactoryNodeLevels) => {
  let iterations = 0

  while (iterations < BUILD_ITERATION_LIMIT) {
    iterations += 1
    const bought = calculateNext(input, levels)
    if (!bought) break
  }
}

const finalizeBuild = (input: FactoryInputState, levels: FactoryNodeLevels): FactoryBuildResult => {
  return {
    levels,
    score: getBuildScore(input, levels),
  }
}

const runGreedyBuild = (input: FactoryInputState, levels: FactoryNodeLevels): FactoryBuildResult => {
  fillGreedyBuild(input, levels)
  return finalizeBuild(input, levels)
}

const forceLevelsTowardTargets = (
  levels: FactoryNodeLevels,
  targetLevels: HybridTargetLevels,
  totalPoints: number,
): boolean => {
  let spentPoints = getSpentPoints(levels)
  let iterations = 0

  while (iterations < BUILD_ITERATION_LIMIT) {
    iterations += 1

    const requiredUpgrades = HYBRID_TARGET_NODE_IDS.filter((id) => levels[id] < targetLevels[id])
      .map((id) => ({
        id,
        cost: getNodeCostAtLevel(id, levels[id] + 1),
      }))
      .filter(({ cost }) => Number.isFinite(cost) && cost > 0)

    if (requiredUpgrades.length === 0) return true

    requiredUpgrades.sort((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost
      return a.id.localeCompare(b.id)
    })

    const nextUpgrade = requiredUpgrades[0]
    if (spentPoints + nextUpgrade.cost > totalPoints) return false

    levels[nextUpgrade.id] += 1
    spentPoints += nextUpgrade.cost
  }

  return false
}

const calculateHybridBuild = (
  input: FactoryInputState,
  baseLevels: FactoryNodeLevels,
  greedyBaseline: FactoryBuildResult,
): FactoryBuildResult => {
  const totalPoints = getTotalPointsFromPrestiges(input.prestigesDone)
  const startSpeed = baseLevels.fabricatorSpeed
  const startParticleOutput = baseLevels.particleOutput
  const maxSpeed = NODE_MAP.fabricatorSpeed.maxLevel
  const maxParticleOutput = NODE_MAP.particleOutput.maxLevel

  let bestBuild = greedyBaseline

  for (let speedTarget = startSpeed; speedTarget <= maxSpeed; speedTarget += 1) {
    let rowHadCandidate = false

    for (let particleTarget = startParticleOutput; particleTarget <= maxParticleOutput; particleTarget += 1) {
      const targetLevels: HybridTargetLevels = {
        fabricatorSpeed: speedTarget,
        particleOutput: particleTarget,
      }

      const candidateLevels = cloneLevels(baseLevels)
      const forced = forceLevelsTowardTargets(candidateLevels, targetLevels, totalPoints)

      if (!forced) break

      rowHadCandidate = true

      const candidateBuild = runGreedyBuild(input, candidateLevels)

      if (candidateBuild.score > bestBuild.score) {
        bestBuild = candidateBuild
      }
    }

    if (!rowHadCandidate) break
  }

  return bestBuild
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
  const normalizedLevels = normalizeFactoryNodeLevels(levels)
  const greedyBaseline = runGreedyBuild(normalizedInput, cloneLevels(normalizedLevels))
  return calculateHybridBuild(normalizedInput, normalizedLevels, greedyBaseline)
}
