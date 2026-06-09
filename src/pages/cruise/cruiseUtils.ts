import { CruiseInputState, CruiseNodeLevels } from "./cruiseTypes"
import cruiseLevelJson from "../../../data/cruise_levels.json"
import { EffectiveValues } from "./cruiseCalculator"

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

export const getEchoTriggerCount = (input: CruiseInputState, levels: CruiseNodeLevels) => {
  const baseTriggerCount = getCruiseLevelEchoTriggerBonus(input.cruiseLevel)
  const triggerLevel = levels.echoTriggerCount
  return baseTriggerCount + triggerLevel
}

export const getEchoMultiplierValue = (input: CruiseInputState, levels: CruiseNodeLevels) => {
  const cruiseBonus = getCruiseLevelEchoMultiplierBonus(input.cruiseLevel)
  return 1.1 + cruiseBonus + levels.echoMultiplier * 0.1
}

const getCruiseLevelEchoTriggerBonus = (cruiseLevel: number) =>
  CRUISE_LEVEL_BONUS_RULES.reduce((total, rule) => {
    if (rule.level > cruiseLevel) return total
    return total + rule.echoTriggerCount
  }, 0)

const getCruiseLevelEchoMultiplierBonus = (cruiseLevel: number) =>
  CRUISE_LEVEL_BONUS_RULES.reduce((total, rule) => {
    if (rule.level > cruiseLevel) return total
    return total + rule.echoMultiplier
  }, 0)

export const calculateEchoFactor = (count: number, multiplier: number) => {
  if (count == 0) return 1
  return Math.pow(multiplier, count + 1)
}

// Quite poor heuristic but More Space is so weak that it's never used.
export const getRoomBonus = (cruiseLevel: number) => cruiseLevel * 0.02

export const REVIEW_MULTIPLIER = 1.03

export const isEchoUnlocked = (input: CruiseInputState) => {
  return input.cruiseLevel >= FIRST_ECHO_TRIGGER_CRUISE_LEVEL || input.prestigesDone >= 25
}

type CruiseLevelBonusRule = {
  level: number
  echoTriggerCount: number
  echoMultiplier: number
}

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

export const FIRST_ECHO_TRIGGER_CRUISE_LEVEL =
  CRUISE_LEVEL_BONUS_RULES.find((rule) => rule.echoTriggerCount > 0)?.level ?? 24
