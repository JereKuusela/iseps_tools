import {
  CRUISE_NODE_DEFINITIONS,
  CruiseNodeDefinition,
  emptyCruiseNodeLevels,
  type CruiseInputState,
  type CruiseNodeId,
  type CruiseNodeLevels,
} from "../pages/cruise/cruiseTypes"
import cruiseLevelJson from "../../data/cruise_levels.json"

export type CruiseSnapshot = {
  baseTicketPrice: number
  baseGuestMin: number
  baseGuestMax: number
  baseRoomMin: number
  baseRoomMax: number
  effectiveTicketPrice: number
  effectiveGuestSpending: number
  effectiveRoomCapacity: number
  objectiveMultiplier: number
}

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
  snapshot: CruiseSnapshot
  rows: CruiseEvaluationRow[]
  bestNodeId: CruiseNodeId | null
}

export type CruiseActionResult = {
  nextLevels: CruiseNodeLevels
  purchasedNodeId: CruiseNodeId | null
  purchasedCost: number
}

type CruiseLevelBonusRule = {
  level: number
  echoTriggerCount: number
  echoMultiplier: number
}

type NodeDefinitionMap = Record<CruiseNodeId, CruiseNodeDefinition>

const NODE_MAP = CRUISE_NODE_DEFINITIONS.reduce((accumulator, definition) => {
  accumulator[definition.id] = definition
  return accumulator
}, {} as NodeDefinitionMap)
const NODE_IDS: CruiseNodeId[] = CRUISE_NODE_DEFINITIONS.map((definition) => definition.id)

const parseCruiseLevelBonusRules = (raw: unknown): CruiseLevelBonusRule[] => {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null

      const levelRaw = (entry as { level?: unknown }).level
      const triggerRaw = (entry as { echoTriggerCount?: unknown }).echoTriggerCount
      const multiplierRaw = (entry as { echoMultiplier?: unknown }).echoMultiplier

      const level = Number(levelRaw)
      const echoTriggerCount = Number(triggerRaw ?? 0)
      const echoMultiplier = Number(multiplierRaw ?? 0)

      if (!Number.isFinite(level) || level < 1) return null

      return {
        level: Math.floor(level),
        echoTriggerCount: Number.isFinite(echoTriggerCount) ? echoTriggerCount : 0,
        echoMultiplier: Number.isFinite(echoMultiplier) ? echoMultiplier : 0,
      }
    })
    .filter((entry): entry is CruiseLevelBonusRule => entry !== null)
    .sort((a, b) => a.level - b.level)
}

const CRUISE_LEVEL_BONUS_RULES = parseCruiseLevelBonusRules(cruiseLevelJson)

const FIRST_ECHO_TRIGGER_CRUISE_LEVEL = CRUISE_LEVEL_BONUS_RULES.find((rule) => rule.echoTriggerCount > 0)?.level ?? 24

const getCruiseLevelEchoTriggerBonus = (cruiseLevel: number) => {
  const normalizedLevel = Math.max(0, Math.floor(sanitizeNumber(cruiseLevel, 0)))

  return CRUISE_LEVEL_BONUS_RULES.reduce((total, rule) => {
    if (rule.level > normalizedLevel) return total
    return total + rule.echoTriggerCount
  }, 0)
}

const getCruiseLevelEchoMultiplierBonus = (cruiseLevel: number) => {
  const normalizedLevel = Math.max(0, Math.floor(sanitizeNumber(cruiseLevel, 0)))

  return CRUISE_LEVEL_BONUS_RULES.reduce((total, rule) => {
    if (rule.level > normalizedLevel) return total
    return total + rule.echoMultiplier
  }, 0)
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const sanitizeNumber = (value: number, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback
  return value
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

/**
 * Calculate effective values from base values and node levels.
 * Applies all multipliers to compute the actual effective values.
 */
export const calculateEffectiveValuesFromBase = (
  baseValues: CruiseInputState,
  levels: CruiseNodeLevels,
): EffectiveValues => {
  const ticketMultiplier = Math.pow(1.4, levels.ticketPrice)
  const guestMultiplier = Math.pow(1.35, levels.guestSpending)

  const effectiveTicketPrice = baseValues.ticketPrice * ticketMultiplier
  const effectiveGuestMin = baseValues.guestSpendingMin * guestMultiplier
  const effectiveGuestMax = baseValues.guestSpendingMax * guestMultiplier
  const effectiveGuestSpending = (effectiveGuestMin + effectiveGuestMax) / 2

  const effectiveRoomMin = baseValues.roomCapacityMin + levels.moreSpace
  const effectiveRoomMax = baseValues.roomCapacityMax + levels.moreSpace * 2
  const effectiveRoomCapacity = (effectiveRoomMin + effectiveRoomMax) / 2

  return {
    ticketPrice: effectiveTicketPrice,
    guestSpending: effectiveGuestSpending,
    roomCapacity: effectiveRoomCapacity,
  }
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

export const getTotalPointsFromPrestiges = (prestigesDone: number) => {
  const prestiges = Math.max(0, Math.floor(sanitizeNumber(prestigesDone, 0)))
  return (prestiges * (prestiges + 1)) / 2
}

export const isEchoUnlocked = (input: CruiseInputState) => {
  return input.cruiseLevel >= FIRST_ECHO_TRIGGER_CRUISE_LEVEL || input.prestigesDone >= 25
}

export const getNodeCostAtLevel = (id: CruiseNodeId, level: number): number => {
  const nextLevel = Math.max(1, Math.floor(sanitizeNumber(level, 1)))

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

const getEchoTriggerCount = (input: CruiseInputState, levels: CruiseNodeLevels) => {
  const baseTriggerCount = getCruiseLevelEchoTriggerBonus(input.cruiseLevel)
  const triggerLevel = levels.echoTriggerCount
  return baseTriggerCount + triggerLevel
}

const getEchoMultiplierValue = (input: CruiseInputState, levels: CruiseNodeLevels) => {
  const cruiseBonus = getCruiseLevelEchoMultiplierBonus(input.cruiseLevel)
  return 1.1 + cruiseBonus + levels.echoMultiplier * 0.1
}

// Quite poor heuristic but More Space is so weak that it's never used.
const getRoomBonus = (cruiseLevel: number) => cruiseLevel * 0.02

const REVIEW_MULTIPLIER = 1.03

export const getCruiseSnapshot = (input: CruiseInputState, levels: CruiseNodeLevels): CruiseSnapshot => {
  const prestigeMultiplier = 1 + levels.prestigeMultiplier
  const particlePerLevel = Math.max(1, 1 + input.cruiseLevel * 0.01)
  const particleMultiplier = Math.pow(particlePerLevel, levels.particleOutput)
  const reviewsMultiplier = Math.pow(REVIEW_MULTIPLIER, levels.betterReviews)
  // Back-calculate base values from effective input values using level 0 (no upgrades)
  // Base values are constant for a given input and represent the underlying game values
  const baseValues = {
    ticket: input.ticketPrice,
    guestMin: input.guestSpendingMin,
    guestMax: input.guestSpendingMax,
    roomMin: input.roomCapacityMin,
    roomMax: input.roomCapacityMax,
  }
  const baseGuestAvg = (baseValues.guestMin + baseValues.guestMax) / 2
  const baseRoomAvg = (baseValues.roomMin + baseValues.roomMax) / 2

  // Calculate effective values from base + node levels being evaluated
  const effectiveValues = calculateEffectiveValuesFromBase(input, levels)

  const echoTriggerCount = getEchoTriggerCount(input, levels)
  const echoMultiplier = getEchoMultiplierValue(input, levels)
  const echoFactor = calculateEchoFactor(echoTriggerCount, echoMultiplier)
  const multipliers = prestigeMultiplier * particleMultiplier * reviewsMultiplier

  const effectiveEarningsPerGuest = effectiveValues.ticketPrice + effectiveValues.guestSpending
  const roomBonus = getRoomBonus(input.cruiseLevel)
  const baseRoomMultiplier = 1 + (baseRoomAvg - 1) * roomBonus
  const roomCapacityMultiplier = 1 + (effectiveValues.roomCapacity - 1) * roomBonus
  const base = (baseValues.ticket + baseGuestAvg) * baseRoomMultiplier
  const objectiveMultiplier = (effectiveEarningsPerGuest * multipliers * roomCapacityMultiplier * echoFactor) / base

  return {
    baseTicketPrice: baseValues.ticket,
    baseGuestMin: baseValues.guestMin,
    baseGuestMax: baseValues.guestMax,
    baseRoomMin: baseValues.roomMin,
    baseRoomMax: baseValues.roomMax,
    effectiveTicketPrice: effectiveValues.ticketPrice,
    effectiveGuestSpending: effectiveValues.guestSpending,
    effectiveRoomCapacity: effectiveValues.roomCapacity,
    objectiveMultiplier,
  }
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

const calculateEchoFactor = (count: number, multiplier: number) => {
  if (count == 0) return 1
  return Math.pow(multiplier, count + 1)
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
    const ticketRatio = values.ticketPrice / Math.max(1, values.ticketPrice + values.guestSpending)
    nextBonusMultiplier = 1 + 0.4 * ticketRatio
  } else if (id === "guestSpending") {
    // Guest spending only affects part of earnings: bonus = 1 + 0.35 * (guest / total)
    const guestRatio = values.guestSpending / Math.max(1, values.ticketPrice + values.guestSpending)
    nextBonusMultiplier = 1 + 0.35 * guestRatio
  } else if (id === "particleOutput") {
    // Multiply by particlePerLevel
    const particlePerLevel = Math.max(1, 1 + input.cruiseLevel * 0.01)
    nextBonusMultiplier = particlePerLevel
  } else if (id === "betterReviews") {
    nextBonusMultiplier = 1.03
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

export const evaluateNextNodeValues = (input: CruiseInputState, levels: CruiseNodeLevels): CruiseEvaluationResult => {
  const values = calculateEffectiveValuesFromBase(input, levels)
  // Currently makes only sense to either invest in ticket price or guest spending, because relative bonus increases faster than the cost.
  // As ticket price has a higher multiplier, it is always better when base ticket price is higher.
  const ticketEval = evaluateNextNodeValuesSub(input, levels, CalculationMode.TicketPrice, values)
  if (input.ticketPrice > (input.guestSpendingMin + input.guestSpendingMax) / 2) return ticketEval
  // Otherwise have to evaluate both cases.
  const guestEval = evaluateNextNodeValuesSub(input, levels, CalculationMode.GuestSpending, values)
  return ticketEval.snapshot.objectiveMultiplier >= guestEval.snapshot.objectiveMultiplier ? ticketEval : guestEval
}

enum CalculationMode {
  TicketPrice,
  GuestSpending,
}
export const evaluateNextNodeValuesSub = (
  input: CruiseInputState,
  levels: CruiseNodeLevels,
  mode: CalculationMode,
  values: EffectiveValues,
): CruiseEvaluationResult => {
  const totalPoints = getTotalPointsFromPrestiges(input.prestigesDone)
  const spentPoints = getSpentPoints(levels)
  const availablePoints = Math.max(0, totalPoints - spentPoints)
  const snapshot = getCruiseSnapshot(input, levels)

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
    ...rows.filter((row) => row.unlocked && row.nextCost !== null).map((row) => row.nextBonusPerPoint),
    0,
  )

  if (maxBonusPerPoint > 0) {
    for (const row of rows) {
      if (row.nextCost !== null && row.unlocked) {
        row.relativeBonusPerPoint = row.nextBonusPerPoint / maxBonusPerPoint
      }
    }
  }

  const bestNode = rows
    .filter((row) => {
      if (!row.affordable) return false
      if (row.nextBonusPerPoint <= 0) return false

      // Don't suggest guest spending if ticket price has higher level (and vice versa)
      // This prevents diminishing returns from leveling the weaker contributor
      if (row.id === "guestSpending" && levels.ticketPrice > levels.guestSpending) {
        return false
      }
      if (row.id === "ticketPrice" && levels.guestSpending > levels.ticketPrice) {
        return false
      }

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
    snapshot,
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

  if (id == "guestSpending" && mode != CalculationMode.GuestSpending) score.nextBonusPerPoint = 0
  if (id == "ticketPrice" && mode != CalculationMode.TicketPrice) score.nextBonusPerPoint = 0

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

export const applyActionBuyNext = (input: CruiseInputState, levels: CruiseNodeLevels): CruiseActionResult => {
  const evaluation = evaluateNextNodeValues(input, levels)
  const bestNodeId = evaluation.bestNodeId

  if (!bestNodeId) {
    return {
      nextLevels: cloneLevels(levels),
      purchasedNodeId: null,
      purchasedCost: 0,
    }
  }

  const row = evaluation.rows.find((entry) => entry.id === bestNodeId)
  if (!row?.nextCost) {
    return {
      nextLevels: cloneLevels(levels),
      purchasedNodeId: null,
      purchasedCost: 0,
    }
  }

  if (row.nextBonusPerPoint <= 0) {
    return {
      nextLevels: cloneLevels(levels),
      purchasedNodeId: null,
      purchasedCost: 0,
    }
  }

  const nextLevels = cloneLevels(levels)
  nextLevels[bestNodeId] = Math.min(NODE_MAP[bestNodeId].maxLevel, nextLevels[bestNodeId] + 1)

  return {
    nextLevels,
    purchasedNodeId: bestNodeId,
    purchasedCost: row.nextCost,
  }
}

export const applyActionSpendAll = (input: CruiseInputState, levels: CruiseNodeLevels): CruiseActionResult => {
  let currentLevels = cloneLevels(levels)
  let currentInput = { ...input }
  let totalCost = 0
  let lastPurchased: CruiseNodeId | null = null
  let iterations = 0

  while (iterations < 5000) {
    iterations += 1

    const action = applyActionBuyNext(currentInput, currentLevels)
    if (!action.purchasedNodeId) break

    currentLevels = action.nextLevels
    totalCost += action.purchasedCost
    lastPurchased = action.purchasedNodeId
  }

  return {
    nextLevels: currentLevels,
    purchasedNodeId: lastPurchased,
    purchasedCost: totalCost,
  }
}

export const applyActionResetAll = emptyCruiseNodeLevels

export const applyActionOptimize = (input: CruiseInputState) => applyActionSpendAll(input, emptyCruiseNodeLevels())
