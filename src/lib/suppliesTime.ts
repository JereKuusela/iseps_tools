const SUPPLY_MAX_TIME = 7 * 80
const COOLDOWN = 7
const MINUTES_PER_DAY = 1440

export const calculateSuppliesMultiplier = (onlineHoursPerDay: number, supplies: number) => {
  const onlineTime = Math.min(SUPPLY_MAX_TIME, onlineHoursPerDay)
  const extraMinutes = (2 * supplies * onlineTime) / COOLDOWN
  return 1 + extraMinutes / MINUTES_PER_DAY
}
