import { getBuildScore } from "./cruiseScore"
import {
  CRUISE_NODE_DEFINITIONS,
  CruiseNodeDefinition,
  emptyCruiseNodeLevels,
  type CruiseInputState,
  type CruiseNodeId,
  type CruiseNodeLevels,
} from "./cruiseTypes"
import {
  calculateEchoFactor,
  calculateEffectiveValuesFromBase,
  FIRST_ECHO_TRIGGER_CRUISE_LEVEL,
  getEchoMultiplierValue,
  getEchoTriggerCount,
  getRoomBonus,
  REVIEW_MULTIPLIER,
} from "./cruiseUtils"

export type CruiseEvaluationRow = {
  id: CruiseNodeId
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

export type CruiseEvaluationResult = {
  totalPoints: number
  spentPoints: number
  availablePoints: number
  rows: CruiseEvaluationRow[]
  bestNodeId: CruiseNodeId | null
}

export type CruiseActionResult = {
  nextLevels: CruiseNodeLevels
  purchasedNodeId: CruiseNodeId | null
  purchasedCost: number
}

type NodeDefinitionMap = Record<CruiseNodeId, CruiseNodeDefinition>

const NODE_MAP = CRUISE_NODE_DEFINITIONS.reduce((accumulator, definition) => {
  accumulator[definition.id] = definition
  return accumulator
}, {} as NodeDefinitionMap)
const NODE_IDS: CruiseNodeId[] = CRUISE_NODE_DEFINITIONS.map((definition) => definition.id)

export const calculateBuild = (input: CruiseInputState, levels: CruiseNodeLevels) => {
  if (levels.ticketPrice >= NODE_MAP.ticketPrice.maxLevel || levels.guestSpending >= NODE_MAP.guestSpending.maxLevel)
    return calculateBuildSub(input, levels, CalculationMode.Both)
  // Currently makes only sense to either invest in ticket price or guest spending, because relative bonus increases faster than the cost.
  // As ticket price has a higher multiplier, it is always better when base ticket price is higher.
  if (input.ticketPrice > (input.guestSpendingMin + input.guestSpendingMax) / 2)
    return calculateBuildSub(input, levels, CalculationMode.TicketPrice)
  const ticket = calculateBuildSub(input, levels, CalculationMode.TicketPrice)
  const guest = calculateBuildSub(input, levels, CalculationMode.GuestSpending)
  return ticket.score >= guest.score ? ticket : guest
}

const calculateBuildSub = (input: CruiseInputState, levels: CruiseNodeLevels, mode: CalculationMode) => {
  let currentLevels = cloneLevels(levels)
  let iterations = 0

  while (iterations < 5000) {
    iterations += 1

    const bought = calculateNext(input, currentLevels, mode)
    if (!bought) break
    if (mode != CalculationMode.Both && currentLevels.ticketPrice >= NODE_MAP.ticketPrice.maxLevel)
      mode = CalculationMode.Both
    if (mode != CalculationMode.Both && currentLevels.guestSpending >= NODE_MAP.guestSpending.maxLevel)
      mode = CalculationMode.Both
  }
  const score = getBuildScore(input, currentLevels)
  return { levels: currentLevels, mode, score }
}

const cloneLevels = (levels: CruiseNodeLevels): CruiseNodeLevels => {
  return {
    prestigeMultiplier: levels.prestigeMultiplier,
    ticketPrice: levels.ticketPrice,
    guestSpending: levels.guestSpending,
    particleOutput: levels.particleOutput,
    maxOfflineTimeCap: levels.maxOfflineTimeCap,
    betterReviews: levels.betterReviews,
    moreSpace: levels.moreSpace,
    echoTriggerCount: levels.echoTriggerCount,
    echoMultiplier: levels.echoMultiplier,
  }
}

export type BaseValues = {
  ticket: number
  guestMin: number
  guestMax: number
  roomMin: number
  roomMax: number
}

export type EffectiveValues = {
  ticketPrice: number
  guestSpending: number
  roomCapacity: number
}

export type EffectiveValuesDetailed = {
  ticketPrice: number
  guestMin: number
  guestMax: number
  roomMin: number
  roomMax: number
}

export const normalizeCruiseInputState = (raw: CruiseInputState): CruiseInputState => {
  const guestMin = Math.max(1, sanitizeNumber(raw.guestSpendingMin, 0))
  const guestMax = Math.max(guestMin, sanitizeNumber(raw.guestSpendingMax, guestMin))

  const roomMin = Math.max(1, sanitizeNumber(raw.roomCapacityMin, 0))
  const roomMax = Math.max(roomMin, sanitizeNumber(raw.roomCapacityMax, roomMin))

  return {
    prestigesDone: Math.max(0, Math.floor(sanitizeNumber(raw.prestigesDone, 0))),
    cruiseLevel: Math.max(1, Math.floor(sanitizeNumber(raw.cruiseLevel, 0))),
    ticketPrice: Math.max(1, sanitizeNumber(raw.ticketPrice, 0)),
    guestSpendingMin: guestMin,
    guestSpendingMax: guestMax,
    roomCapacityMin: roomMin,
    roomCapacityMax: roomMax,
  }
}

export const normalizeCruiseNodeLevels = (levels: CruiseNodeLevels): CruiseNodeLevels => {
  const normalized = emptyCruiseNodeLevels()

  for (const id of NODE_IDS) {
    const maxLevel = NODE_MAP[id].maxLevel
    normalized[id] = clamp(Math.floor(sanitizeNumber(levels[id], 0)), 0, maxLevel)
  }

  return normalized
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const sanitizeNumber = (value: number, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback
  return value
}

export const getTotalPointsFromPrestiges = (prestigesDone: number) => {
  const prestiges = prestigesDone
  return (prestiges * (prestiges + 1)) / 2
}

export const getNodeCostAtLevel = (id: CruiseNodeId, level: number): number => {
  const nextLevel = level

  if (id === "prestigeMultiplier") {
    if (nextLevel <= 1) return 1
    return Math.floor((nextLevel - 1) / 10) + 2
  }

  if (id === "ticketPrice" || id === "guestSpending") {
    if (nextLevel <= 21) return nextLevel * 2
    return 64 + (nextLevel - 22) * 22
  }

  if (id === "particleOutput") {
    return nextLevel + 1
  }

  if (id === "maxOfflineTimeCap") {
    return 1
  }

  if (id === "betterReviews") {
    return 3
  }

  if (id === "moreSpace") {
    return 15 + (nextLevel - 1) * 3
  }

  if (id === "echoTriggerCount") {
    return 40 + (nextLevel - 1) * 10
  }

  return 30
}

export const getSpentPoints = (levels: CruiseNodeLevels): number => {
  return NODE_IDS.reduce((total, id) => {
    const level = levels[id]
    let nodeCost = 0

    for (let current = 1; current <= level; current += 1) {
      nodeCost += getNodeCostAtLevel(id, current)
    }

    return total + nodeCost
  }, 0)
}

export const getAvailablePoints = (input: CruiseInputState, levels: CruiseNodeLevels): number => {
  const total = getTotalPointsFromPrestiges(input.prestigesDone)
  return Math.max(0, total - getSpentPoints(levels))
}

const getNodeUnlockState = (id: CruiseNodeId, input: CruiseInputState, levels: CruiseNodeLevels) => {
  if (id === "echoTriggerCount")
    return input.prestigesDone >= 25 || input.cruiseLevel >= FIRST_ECHO_TRIGGER_CRUISE_LEVEL

  if (id === "echoMultiplier")
    return input.cruiseLevel >= FIRST_ECHO_TRIGGER_CRUISE_LEVEL || levels.echoTriggerCount > 0

  if (input.prestigesDone < NODE_MAP[id].minFillsDone) return false

  if (input.cruiseLevel < NODE_MAP[id].minCruiseLevel) return false

  return true
}

const deepEvaluateEchoScore = (input: CruiseInputState, levels: CruiseNodeLevels, availablePoints: number) => {
  const availableEchoCounts = NODE_MAP["echoTriggerCount"].maxLevel - levels.echoTriggerCount
  const availableEchoMult = NODE_MAP["echoMultiplier"].maxLevel - levels.echoMultiplier
  const baseEchoTrigger = getEchoTriggerCount(input, levels)
  const baseEchoMult = getEchoMultiplierValue(input, levels)
  const baseEchoFactor = calculateEchoFactor(baseEchoTrigger, baseEchoMult)
  let bestBonusPerPoint = 0
  let totalCountCost = 0
  for (let echoCount = 0; echoCount <= availableEchoCounts; echoCount += 1) {
    let totalMultCost = 0
    for (let echoMult = 0; echoMult <= availableEchoMult; echoMult += 1) {
      const totalCost = totalCountCost + totalMultCost
      if (totalCost > availablePoints) break
      if (totalCost > 0) {
        const nextEchoTrigger = baseEchoTrigger + echoCount
        const nextEchoMult = baseEchoMult + echoMult * 0.1
        const nextEchoFactor = calculateEchoFactor(nextEchoTrigger, nextEchoMult)
        const nextBonusMultiplier = nextEchoFactor / baseEchoFactor
        const bonusPerPoint = calculateLongTermScore(nextBonusMultiplier, totalCost)
        if (bonusPerPoint > bestBonusPerPoint) {
          bestBonusPerPoint = bonusPerPoint
        }
      }

      totalMultCost += getNodeCostAtLevel("echoMultiplier", levels.echoMultiplier + 1 + echoMult)
    }
    totalCountCost += getNodeCostAtLevel("echoTriggerCount", levels.echoTriggerCount + 1 + echoCount)
  }
  return bestBonusPerPoint
}

// Some upgrades are additive and some are multiplicate, so no easy way to calculate the combined effect.
// Deep echo evaluation uses lots of points so logairthmic scoring ensures it's not overvalued compared to smaller, possibly multiplicative upgrades.
const calculateLongTermScore = (bonusMultiplier: number, cost: number) => {
  if (!Number.isFinite(bonusMultiplier) || bonusMultiplier <= 0) return 0
  if (!Number.isFinite(cost) || cost <= 0) return 0
  return Math.log(bonusMultiplier) / cost
}

const evaluateNodeScore = (
  input: CruiseInputState,
  levels: CruiseNodeLevels,
  id: CruiseNodeId,
  values: EffectiveValues,
) => {
  const nextLevel = levels[id] + 1
  const nextCost = getNodeCostAtLevel(id, nextLevel)

  let nextBonusMultiplier = 1

  // Calculate marginal impact for each node type directly
  if (id === "prestigeMultiplier") {
    // (1 + nextLevel) / (1 + currentLevel)
    nextBonusMultiplier = (1 + nextLevel) / (1 + levels[id])
  } else if (id === "ticketPrice") {
    // Ticket price only affects part of earnings: bonus = 1 + 0.4 * (ticket / total)
    const ticketRatio = values.ticketPrice / (values.ticketPrice + values.guestSpending)
    nextBonusMultiplier = 1 + 0.4 * ticketRatio
  } else if (id === "guestSpending") {
    // Guest spending only affects part of earnings: bonus = 1 + 0.35 * (guest / total)
    const guestRatio = values.guestSpending / (values.ticketPrice + values.guestSpending)
    nextBonusMultiplier = 1 + 0.35 * guestRatio
  } else if (id === "particleOutput") {
    // Multiply by particlePerLevel
    const particlePerLevel = 1 + input.cruiseLevel * 0.01
    nextBonusMultiplier = particlePerLevel
  } else if (id === "betterReviews") {
    nextBonusMultiplier = REVIEW_MULTIPLIER
  } else if (id === "moreSpace") {
    // Adding +1 to min, +2 to max: average increases by +1.5
    const baseRoomMin = Math.max(1, input.roomCapacityMin - levels.moreSpace)
    const baseRoomMax = Math.max(1, input.roomCapacityMax - levels.moreSpace * 2)
    const baseRoomAvg = (baseRoomMin + baseRoomMax) / 2

    const currentRoomCapacity = baseRoomAvg + (3 * levels.moreSpace) / 2
    const nextRoomCapacity = currentRoomCapacity + 1.5

    const roomBonus = getRoomBonus(input.cruiseLevel)
    const currentMultiplier = 1 + (currentRoomCapacity - 1) * roomBonus
    const nextMultiplier = 1 + (nextRoomCapacity - 1) * roomBonus
    nextBonusMultiplier = nextMultiplier / Math.max(currentMultiplier, Number.EPSILON)
  } else if (id === "echoTriggerCount") {
    const currentEchoTrigger = getEchoTriggerCount(input, levels)
    const currentEchoMult = getEchoMultiplierValue(input, levels)
    const currentEchoFactor = calculateEchoFactor(currentEchoTrigger, currentEchoMult)

    const nextEchoFactor = calculateEchoFactor(currentEchoTrigger + 1, currentEchoMult)

    nextBonusMultiplier = nextEchoFactor / currentEchoFactor
  } else if (id === "echoMultiplier") {
    const currentEchoTrigger = getEchoTriggerCount(input, levels)
    const currentEchoMult = getEchoMultiplierValue(input, levels)
    const currentEchoFactor = calculateEchoFactor(currentEchoTrigger, currentEchoMult)

    const nextEchoFactor = calculateEchoFactor(currentEchoTrigger, currentEchoMult + 0.1)

    nextBonusMultiplier = nextEchoFactor / currentEchoFactor
  }

  const nextBonusPerPoint = (nextBonusMultiplier - 1) / nextCost

  return { nextCost, nextBonusMultiplier, nextBonusPerPoint }
}

export enum CalculationMode {
  TicketPrice,
  GuestSpending,
  Both,
}
export const evaluateNextNodeValues = (
  input: CruiseInputState,
  levels: CruiseNodeLevels,
  mode: CalculationMode,
): CruiseEvaluationResult => {
  const values = calculateEffectiveValuesFromBase(input, levels)
  const totalPoints = getTotalPointsFromPrestiges(input.prestigesDone)
  const spentPoints = getSpentPoints(levels)
  const availablePoints = Math.max(0, totalPoints - spentPoints)

  const evaluated = {} as Record<CruiseNodeId, CruiseEvaluationRow>
  for (const id of NODE_IDS) {
    const row = evaluateNode(id, input, levels, mode, availablePoints, values)
    evaluated[id] = row
  }
  if (evaluated["echoTriggerCount"].affordable || evaluated["echoMultiplier"].affordable) {
    const echoScore = deepEvaluateEchoScore(input, levels, availablePoints)
    const countScore = evaluated["echoTriggerCount"].nextBonusPerPoint
    const multScore = evaluated["echoMultiplier"].nextBonusPerPoint
    if (countScore > multScore) {
      evaluated["echoTriggerCount"].nextBonusPerPoint = Math.max(countScore, echoScore)
    } else {
      evaluated["echoMultiplier"].nextBonusPerPoint = Math.max(multScore, echoScore)
    }
  }
  const rows = Object.values(evaluated)

  // Calculate relative bonus per point (normalized against best option)
  const maxBonusPerPoint = Math.max(
    ...rows.filter((row) => row.unlocked && row.nextCost).map((row) => row.nextBonusPerPoint),
    0,
  )
  if (maxBonusPerPoint > 0) {
    for (const row of rows) {
      if (row.nextCost && row.unlocked) {
        row.relativeBonusPerPoint = row.nextBonusPerPoint / maxBonusPerPoint
      }
    }
  }

  const bestNode = rows
    .filter((row) => {
      if (!row.affordable) return false
      if (row.nextBonusPerPoint <= 0) return false
      return true
    })
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

const evaluateNode = (
  id: CruiseNodeId,
  input: CruiseInputState,
  levels: CruiseNodeLevels,
  mode: CalculationMode,
  availablePoints: number,
  values: EffectiveValues,
) => {
  const definition = NODE_MAP[id]
  const level = levels[id]
  const unlocked = getNodeUnlockState(id, input, levels)
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

  const score = evaluateNodeScore(input, levels, id, values)

  if (id == "guestSpending" && mode == CalculationMode.TicketPrice) score.nextBonusPerPoint = 0
  if (id == "ticketPrice" && mode == CalculationMode.GuestSpending) score.nextBonusPerPoint = 0

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

const calculateNext = (input: CruiseInputState, levels: CruiseNodeLevels, mode: CalculationMode) => {
  const evaluation = evaluateNextNodeValues(input, levels, mode)
  const bestNodeId = evaluation.bestNodeId

  if (!bestNodeId) return false

  const row = evaluation.rows.find((entry) => entry.id === bestNodeId)
  if (!row?.nextCost) return false
  if (row.nextBonusPerPoint <= 0) return false

  levels[bestNodeId] = Math.min(NODE_MAP[bestNodeId].maxLevel, levels[bestNodeId] + 1)
  return true
}
