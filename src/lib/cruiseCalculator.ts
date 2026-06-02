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
  score: number
  plannedSpend: number
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

type DeepPlanResult = {
  objective: number
  spent: number
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

const ECHO_NODE_IDS: CruiseNodeId[] = ["echoTriggerCount", "echoMultiplier"]

const OFFLINE_BASELINE_SCORE = 0

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

const sanitizeScore = (value: number, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback
  return value
}

const safePow = (base: number, exponent: number) => {
  const sanitizedBase = Math.max(Number.EPSILON, sanitizeNumber(base, 1))
  const sanitizedExp = Math.max(0, Math.floor(sanitizeNumber(exponent, 0)))
  return sanitizedBase ** sanitizedExp
}

const serializeLevels = (levels: CruiseNodeLevels) => {
  return NODE_IDS.map((id) => levels[id]).join("|")
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
 * Calculate base values from effective input values and current node levels.
 * This reverses the multiplier effects to find the underlying base values.
 */
export const calculateBaseValuesFromInput = (input: CruiseInputState, levels: CruiseNodeLevels): BaseValues => {
  const groupMultiplier = safePow(1.08, input.groupsDiscountLevel)
  const bunkMultiplier = safePow(1.05, input.bunkBedsLevel)
  const sunMultiplier = Math.max(groupMultiplier * bunkMultiplier, Number.EPSILON)

  const ticketMultiplier = safePow(1.4, levels.ticketPrice)
  const guestMultiplier = safePow(1.35, levels.guestSpending)

  return {
    ticket: input.ticketPrice / Math.max(ticketMultiplier, Number.EPSILON),
    guestMin: input.guestSpendingMin / Math.max(guestMultiplier, Number.EPSILON),
    guestMax: input.guestSpendingMax / Math.max(guestMultiplier, Number.EPSILON),
    roomMin: Math.max(1, input.roomCapacityMin / sunMultiplier - levels.moreSpace),
    roomMax: Math.max(1, input.roomCapacityMax / sunMultiplier - levels.moreSpace * 2),
  }
}

/**
 * Calculate effective values from base values and node levels.
 * Applies all multipliers to compute the actual effective values.
 */
export const calculateEffectiveValuesFromBase = (
  input: CruiseInputState,
  baseValues: BaseValues,
  levels: CruiseNodeLevels,
): EffectiveValues => {
  const groupMultiplier = safePow(1.08, input.groupsDiscountLevel)
  const bunkMultiplier = safePow(1.05, input.bunkBedsLevel)
  const sunMultiplier = Math.max(groupMultiplier * bunkMultiplier, Number.EPSILON)

  const ticketMultiplier = safePow(1.4, levels.ticketPrice)
  const guestMultiplier = safePow(1.35, levels.guestSpending)

  const effectiveTicketPrice = baseValues.ticket * ticketMultiplier
  const effectiveGuestMin = baseValues.guestMin * guestMultiplier
  const effectiveGuestMax = baseValues.guestMax * guestMultiplier
  const effectiveGuestSpending = (effectiveGuestMin + effectiveGuestMax) / 2

  const effectiveRoomMin = (baseValues.roomMin + levels.moreSpace) * sunMultiplier
  const effectiveRoomMax = (baseValues.roomMax + levels.moreSpace * 2) * sunMultiplier
  const effectiveRoomCapacity = (effectiveRoomMin + effectiveRoomMax) / 2

  return {
    ticketPrice: effectiveTicketPrice,
    guestSpending: effectiveGuestSpending,
    roomCapacity: effectiveRoomCapacity,
  }
}

/**
 * Calculate detailed effective values from base values and node levels.
 * Returns separate min/max values instead of averages.
 * This is the exact reverse of calculateBaseValuesFromInput.
 */
export const calculateEffectiveValuesDetailed = (
  input: CruiseInputState,
  baseValues: BaseValues,
  levels: CruiseNodeLevels,
): EffectiveValuesDetailed => {
  const groupMultiplier = safePow(1.08, input.groupsDiscountLevel)
  const bunkMultiplier = safePow(1.05, input.bunkBedsLevel)
  const sunMultiplier = Math.max(groupMultiplier * bunkMultiplier, Number.EPSILON)

  const ticketMultiplier = safePow(1.4, levels.ticketPrice)
  const guestMultiplier = safePow(1.35, levels.guestSpending)

  const effectiveTicketPrice = baseValues.ticket * ticketMultiplier
  const effectiveGuestMin = baseValues.guestMin * guestMultiplier
  const effectiveGuestMax = baseValues.guestMax * guestMultiplier
  const effectiveRoomMin = (baseValues.roomMin + levels.moreSpace) * sunMultiplier
  const effectiveRoomMax = (baseValues.roomMax + levels.moreSpace * 2) * sunMultiplier

  return {
    ticketPrice: effectiveTicketPrice,
    guestMin: effectiveGuestMin,
    guestMax: effectiveGuestMax,
    roomMin: effectiveRoomMin,
    roomMax: effectiveRoomMax,
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
    groupsDiscountLevel: Math.max(0, Math.floor(sanitizeNumber(raw.groupsDiscountLevel, 0))),
    bunkBedsLevel: Math.max(0, Math.floor(sanitizeNumber(raw.bunkBedsLevel, 0))),
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
  if (id === "echoTriggerCount") {
    return input.prestigesDone >= 25 || input.cruiseLevel >= FIRST_ECHO_TRIGGER_CRUISE_LEVEL
  }

  if (id === "echoMultiplier") {
    return input.cruiseLevel >= FIRST_ECHO_TRIGGER_CRUISE_LEVEL || levels.echoTriggerCount > 0
  }

  if (input.prestigesDone < NODE_MAP[id].minFillsDone) {
    return false
  }

  if (input.cruiseLevel < NODE_MAP[id].minCruiseLevel) {
    return false
  }

  return true
}

const getEchoTriggerCount = (input: CruiseInputState, levels: CruiseNodeLevels) => {
  const baseTriggerCount = getCruiseLevelEchoTriggerBonus(input.cruiseLevel)
  const triggerLevel = levels.echoTriggerCount
  const rawCount = baseTriggerCount + triggerLevel

  if (triggerLevel > 0 && rawCount < 2) {
    return 2
  }

  return rawCount
}

const getEchoMultiplierValue = (input: CruiseInputState, levels: CruiseNodeLevels) => {
  const cruiseBonus = getCruiseLevelEchoMultiplierBonus(input.cruiseLevel)
  return 1.1 + cruiseBonus + levels.echoMultiplier * 0.1
}

export const getCruiseSnapshot = (input: CruiseInputState, levels: CruiseNodeLevels): CruiseSnapshot => {
  const prestigeMultiplier = 1 + levels.prestigeMultiplier
  const particlePerLevel = Math.max(1, 1 + input.cruiseLevel * 0.01)
  const particleMultiplier = safePow(particlePerLevel, levels.particleOutput)
  const reviewsMultiplier = safePow(1.03, levels.betterReviews)

  // Back-calculate base values from effective input values
  const baseValues = calculateBaseValuesFromInput(input, levels)
  const baseGuestAvg = (baseValues.guestMin + baseValues.guestMax) / 2
  const baseRoomAvg = (baseValues.roomMin + baseValues.roomMax) / 2

  // Calculate effective values from base + node levels being evaluated
  const effectiveValues = calculateEffectiveValuesFromBase(input, baseValues, levels)

  const echoTriggerCount = getEchoTriggerCount(input, levels)
  const echoMultiplier = getEchoMultiplierValue(input, levels)
  const echoFactor = echoTriggerCount > 0 ? safePow(echoMultiplier, echoTriggerCount) : 1
  const multipliers = prestigeMultiplier * particleMultiplier * reviewsMultiplier

  const effectiveEarningsPerGuest = effectiveValues.ticketPrice + effectiveValues.guestSpending
  const base = (baseValues.ticket + baseGuestAvg) * baseRoomAvg
  const objectiveMultiplier =
    (effectiveEarningsPerGuest * multipliers * effectiveValues.roomCapacity * echoFactor) / base

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

const evaluateImmediateStep = (input: CruiseInputState, levels: CruiseNodeLevels, id: CruiseNodeId) => {
  const nextLevel = levels[id] + 1
  const nextCost = getNodeCostAtLevel(id, nextLevel)

  let nextBonusMultiplier = 1

  // Calculate marginal impact for each node type directly
  if (id === "prestigeMultiplier") {
    // (1 + nextLevel) / (1 + currentLevel)
    nextBonusMultiplier = (1 + nextLevel) / (1 + levels[id])
  } else if (id === "ticketPrice") {
    // Ticket price only affects part of earnings: bonus = 1 + 0.4 * (ticket / total)
    const ticketRatio =
      input.ticketPrice / Math.max(1, input.ticketPrice + (input.guestSpendingMin + input.guestSpendingMax) / 2)
    nextBonusMultiplier = 1 + 0.4 * ticketRatio
  } else if (id === "guestSpending") {
    // Guest spending only affects part of earnings: bonus = 1 + 0.35 * (guest / total)
    const guestAvg = (input.guestSpendingMin + input.guestSpendingMax) / 2
    const guestRatio = guestAvg / Math.max(1, input.ticketPrice + guestAvg)
    nextBonusMultiplier = 1 + 0.35 * guestRatio
  } else if (id === "particleOutput") {
    // Multiply by particlePerLevel
    const particlePerLevel = Math.max(1, 1 + input.cruiseLevel * 0.01)
    nextBonusMultiplier = particlePerLevel
  } else if (id === "betterReviews") {
    nextBonusMultiplier = 1.03
  } else if (id === "moreSpace") {
    // If room capacity is 1, user hasn't set it yet - no value
    if (input.roomCapacityMin === 1) {
      nextBonusMultiplier = 1
    } else {
      // Adding +1 to min, +2 to max: average increases by +1.5
      const groupMultiplier = safePow(1.08, input.groupsDiscountLevel)
      const bunkMultiplier = safePow(1.05, input.bunkBedsLevel)
      const sunMultiplier = Math.max(groupMultiplier * bunkMultiplier, 1)

      const baseRoomMin = Math.max(1, input.roomCapacityMin / sunMultiplier - levels.moreSpace)
      const baseRoomMax = Math.max(1, input.roomCapacityMax / sunMultiplier - levels.moreSpace * 2)
      const baseRoomAvg = (baseRoomMin + baseRoomMax) / 2

      const currentRoomCapacity = baseRoomAvg + (levels.moreSpace + levels.moreSpace * 2) / 2
      const nextRoomCapacity = currentRoomCapacity + 1.5
      nextBonusMultiplier = nextRoomCapacity / Math.max(1, currentRoomCapacity)
    }
  } else if (id === "echoTriggerCount" || id === "echoMultiplier") {
    // Echo nodes need full calculation due to power function
    const currentEchoTrigger = getEchoTriggerCount(input, levels)
    const currentEchoMult = getEchoMultiplierValue(input, levels)
    const currentEchoFactor = currentEchoTrigger > 0 ? safePow(currentEchoMult, currentEchoTrigger) : 1

    const nextLevels = cloneLevels(levels)
    nextLevels[id] = nextLevel
    const nextEchoTrigger = getEchoTriggerCount(input, nextLevels)
    const nextEchoMult = getEchoMultiplierValue(input, nextLevels)
    const nextEchoFactor = nextEchoTrigger > 0 ? safePow(nextEchoMult, nextEchoTrigger) : 1

    nextBonusMultiplier = nextEchoFactor / Math.max(currentEchoFactor, Number.EPSILON)
  }

  const nextBonusPerPoint = sanitizeScore((nextBonusMultiplier - 1) / Math.max(1, nextCost), 0)

  return {
    nextCost,
    nextBonusMultiplier: sanitizeScore(nextBonusMultiplier, 1),
    nextBonusPerPoint,
  }
}

const deepPlanBestObjective = (
  input: CruiseInputState,
  levels: CruiseNodeLevels,
  budget: number,
  allowedNodes: CruiseNodeId[],
  maxDepth: number,
  memo: Map<string, DeepPlanResult>,
): DeepPlanResult => {
  const currentObjective = getCruiseSnapshot(input, levels).objectiveMultiplier

  if (budget <= 0 || maxDepth <= 0) {
    return { objective: currentObjective, spent: 0 }
  }

  const key = `${serializeLevels(levels)}|${budget}|${maxDepth}|${allowedNodes.join(",")}`
  const cached = memo.get(key)
  if (cached) return cached

  let best: DeepPlanResult = {
    objective: currentObjective,
    spent: 0,
  }

  for (const id of allowedNodes) {
    if (!getNodeUnlockState(id, input, levels)) continue
    const currentLevel = levels[id]
    const maxLevel = NODE_MAP[id].maxLevel
    if (currentLevel >= maxLevel) continue

    const nextLevel = currentLevel + 1
    const cost = getNodeCostAtLevel(id, nextLevel)
    if (cost > budget) continue

    const nextLevels = cloneLevels(levels)
    nextLevels[id] = nextLevel

    const child = deepPlanBestObjective(input, nextLevels, budget - cost, allowedNodes, maxDepth - 1, memo)
    const candidate: DeepPlanResult = {
      objective: child.objective,
      spent: cost + child.spent,
    }

    if (candidate.objective > best.objective + Number.EPSILON) {
      best = candidate
      continue
    }

    if (Math.abs(candidate.objective - best.objective) <= Number.EPSILON && candidate.spent < best.spent) {
      best = candidate
    }
  }

  memo.set(key, best)
  return best
}

const evaluateNodeScore = (
  input: CruiseInputState,
  levels: CruiseNodeLevels,
  id: CruiseNodeId,
  availablePoints: number,
  currentObjective: number,
) => {
  const immediate = evaluateImmediateStep(input, levels, id)

  const nextLevels = cloneLevels(levels)
  nextLevels[id] += 1

  const remainingBudget = Math.max(0, availablePoints - immediate.nextCost)
  const allowedNodes = ECHO_NODE_IDS.includes(id) ? ECHO_NODE_IDS : []

  if (allowedNodes.length === 0) {
    const immediateScore = sanitizeScore((immediate.nextBonusMultiplier - 1) / Math.max(1, immediate.nextCost), 0)
    return {
      score: id === "maxOfflineTimeCap" ? OFFLINE_BASELINE_SCORE : immediateScore,
      plannedSpend: immediate.nextCost,
      immediate,
    }
  }

  const deepBudget = Math.max(0, remainingBudget)
  const maxDepth = Math.min(8, Math.max(1, deepBudget))
  const memo = new Map<string, DeepPlanResult>()
  const continuation = deepPlanBestObjective(input, nextLevels, deepBudget, allowedNodes, maxDepth, memo)

  const fullObjective = continuation.objective
  const fullSpent = immediate.nextCost + continuation.spent
  const fullScore = sanitizeScore(
    (fullObjective / Math.max(currentObjective, Number.EPSILON) - 1) / Math.max(1, fullSpent),
    0,
  )

  return {
    score: id === "maxOfflineTimeCap" ? OFFLINE_BASELINE_SCORE : fullScore,
    plannedSpend: fullSpent,
    immediate,
  }
}

export const evaluateNextNodeValues = (input: CruiseInputState, levels: CruiseNodeLevels): CruiseEvaluationResult => {
  const totalPoints = getTotalPointsFromPrestiges(input.prestigesDone)
  const spentPoints = getSpentPoints(levels)
  const availablePoints = Math.max(0, totalPoints - spentPoints)
  const snapshot = getCruiseSnapshot(input, levels)
  const currentObjective = snapshot.objectiveMultiplier

  const rows: CruiseEvaluationRow[] = NODE_IDS.map((id) => {
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
        score: 0,
        plannedSpend: 0,
      }
    }

    const scoreResult = evaluateNodeScore(input, levels, id, availablePoints, currentObjective)

    return {
      id,
      label: definition.label,
      level,
      maxLevel: definition.maxLevel,
      unlocked,
      affordable,
      nextCost,
      nextBonusMultiplier: scoreResult.immediate.nextBonusMultiplier,
      nextBonusPerPoint: scoreResult.immediate.nextBonusPerPoint,
      relativeBonusPerPoint: 0,
      score: scoreResult.score,
      plannedSpend: scoreResult.plannedSpend,
    }
  })

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
    .filter((row) => row.affordable)
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
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

  if (row.score <= 0 && bestNodeId !== "maxOfflineTimeCap") {
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

  // Calculate initial base values from input with starting levels
  const baseValues = calculateBaseValuesFromInput(input, levels)

  while (iterations < 5000) {
    iterations += 1

    const action = applyActionBuyNext(currentInput, currentLevels)
    if (!action.purchasedNodeId) break

    currentLevels = action.nextLevels
    totalCost += action.purchasedCost
    lastPurchased = action.purchasedNodeId

    // Update effective input values based on level changes
    const effectiveValues = calculateEffectiveValuesFromBase(input, baseValues, currentLevels)
    currentInput = {
      ...currentInput,
      ticketPrice: effectiveValues.ticketPrice,
      guestSpendingMin: effectiveValues.guestSpending,
      guestSpendingMax: effectiveValues.guestSpending,
      roomCapacityMin: effectiveValues.roomCapacity,
      roomCapacityMax: effectiveValues.roomCapacity,
    }
  }

  return {
    nextLevels: currentLevels,
    purchasedNodeId: lastPurchased,
    purchasedCost: totalCost,
  }
}

export const applyActionResetAll = (): CruiseNodeLevels => {
  return emptyCruiseNodeLevels()
}

export const applyActionOptimize = (input: CruiseInputState): CruiseActionResult => {
  return applyActionSpendAll(input, emptyCruiseNodeLevels())
}
