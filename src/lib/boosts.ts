const SUPPLY_MAX_TIME = (7 * 80) / 60
const SUPPLIES_COOLDOWN_HOURS = 7
const MINUTES_PER_DAY = 1440

export const BASIC_CHEST_INTERVAL_SECONDS = 360
export const BASIC_CHEST_TIME_JUMP_SECONDS = 120
export const BASIC_CHEST_MAX_PER_DAY = 100
export const RARE_CHEST_INTERVAL_SECONDS = 1200
export const RARE_CHEST_TIME_JUMP_SECONDS = 360
export const RARE_CHEST_MAX_PER_DAY = 30

const CHESTS_MAX_ACQUISITION_HOURS = (BASIC_CHEST_INTERVAL_SECONDS * BASIC_CHEST_MAX_PER_DAY) / 3600
const CHESTS_MAX_SKIP_MINUTES =
  (BASIC_CHEST_TIME_JUMP_SECONDS * BASIC_CHEST_MAX_PER_DAY + RARE_CHEST_TIME_JUMP_SECONDS * RARE_CHEST_MAX_PER_DAY) / 60

const clampRatio = (value: number, maximum: number) => Math.min(1, Math.max(0, value) / maximum)

export const getSupplyRatio = (onlineHoursPerDay: number) => clampRatio(onlineHoursPerDay, SUPPLY_MAX_TIME)

const calculateChestSkipMinutes = (onlineHoursPerDay: number) =>
  clampRatio(onlineHoursPerDay, CHESTS_MAX_ACQUISITION_HOURS) * CHESTS_MAX_SKIP_MINUTES

export const calculateChestsMultiplier = (onlineHoursPerDay: number) =>
  1 + calculateChestSkipMinutes(onlineHoursPerDay) / MINUTES_PER_DAY

export const calculateBoostsMultiplier = (onlineHoursPerDay: number, supplies: number) => {
  const suppliesSkipMinutes = 2 * Math.max(0, supplies) * clampRatio(onlineHoursPerDay, SUPPLIES_COOLDOWN_HOURS)
  const chestSkipMinutes = calculateChestSkipMinutes(onlineHoursPerDay)
  const extraMinutes = suppliesSkipMinutes + chestSkipMinutes

  return 1 + extraMinutes / MINUTES_PER_DAY
}
