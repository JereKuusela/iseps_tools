import { CruiseInputState, CruiseNodeLevels } from "./cruiseTypes"
import {
  calculateEchoFactor,
  calculateEffectiveValuesFromBase,
  getEchoMultiplierValue,
  getEchoTriggerCount,
  getRoomBonus,
  REVIEW_MULTIPLIER,
} from "./cruiseUtils"

export const getBuildScore = (input: CruiseInputState, levels: CruiseNodeLevels): number => {
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
  const score = (effectiveEarningsPerGuest * multipliers * roomCapacityMultiplier * echoFactor) / base

  return score - 1
}
