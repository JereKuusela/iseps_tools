const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY
const MINUTES_PER_YEAR = 52 * MINUTES_PER_WEEK

export const formatTimeDuration = (minutes: number) => {
  if (!Number.isFinite(minutes)) return "1 eternity"

  const safeMinutes = Math.max(0, minutes)

  if (safeMinutes < MINUTES_PER_HOUR) return `${safeMinutes.toFixed(1)} mins`
  if (safeMinutes < MINUTES_PER_DAY) return `${(safeMinutes / MINUTES_PER_HOUR).toFixed(1)} hours`
  if (safeMinutes < 28 * MINUTES_PER_DAY) return `${(safeMinutes / MINUTES_PER_DAY).toFixed(1)} days`
  if (safeMinutes < MINUTES_PER_YEAR) return `${(safeMinutes / MINUTES_PER_WEEK).toFixed(1)} weeks`
  if (safeMinutes < 10 * MINUTES_PER_YEAR) return `${(safeMinutes / MINUTES_PER_YEAR).toFixed(1)} years`

  return "1 eternity"
}

export const formatTimeDurationFromMinutes = (minutes: number) => {
  if (!Number.isFinite(minutes)) return "1 eternity"

  const safeMinutes = Math.max(0, minutes)

  if (safeMinutes < MINUTES_PER_HOUR) return `${safeMinutes} minutes`
  if (safeMinutes < MINUTES_PER_DAY) return `${(safeMinutes / MINUTES_PER_HOUR).toFixed(1)} hours`
  if (safeMinutes < 28 * MINUTES_PER_DAY) return `${(safeMinutes / MINUTES_PER_DAY).toFixed(1)} days`
  if (safeMinutes < MINUTES_PER_YEAR) return `${(safeMinutes / MINUTES_PER_WEEK).toFixed(1)} weeks`
  if (safeMinutes < 10 * MINUTES_PER_YEAR) return `${(safeMinutes / MINUTES_PER_YEAR).toFixed(1)} years`

  return "1 eternity"
}
export const formatTimeDurationFromSeconds = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "1 eternity"
  if (seconds <= 0) return "Ready"
  if (seconds < MINUTES_PER_HOUR) return `${Math.ceil(seconds)} sec`

  return formatTimeDuration(seconds / MINUTES_PER_HOUR)
}

export const formatLocalTimestampFromMinutes = (minutes: number, now = new Date()) => {
  if (!Number.isFinite(minutes)) return "Unknown"

  const target = new Date(now.getTime() + minutes * MINUTES_PER_HOUR * 1000)
  const includeYear = target.getFullYear() !== now.getFullYear()
  if (includeYear) {
    const dateText = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(target)
    return dateText
  } else {
    const timeText = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(target)

    const dateText = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "numeric",
    }).format(target)

    return `${timeText} ${dateText.substring(0, dateText.length - 1)}`
  }
}
