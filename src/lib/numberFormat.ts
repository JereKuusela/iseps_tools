import { LargeNumber } from "./largeNumber"

const zeroWithDigits = (digits: number) => {
  if (digits <= 0) return "0"
  return `0.${"0".repeat(digits)}`
}

export const formatFixed = (value: number, digits = 2, fallback = zeroWithDigits(digits)) => {
  if (!Number.isFinite(value)) return fallback
  return value.toFixed(digits)
}

export const formatPercent = (value: number, digits = 2, fallback = "0%") => {
  if (!Number.isFinite(value)) return fallback
  return `${value.toFixed(digits)}%`
}

export const formatPercentFromRatio = (value: number, digits?: number, fallback = "0%") => {
  if (!Number.isFinite(value)) return fallback
  const percentValue = value * 100
  if (digits === undefined) return `${percentValue}%`
  return formatPercent(percentValue, digits, fallback)
}

export const formatMultiplier = (value: number, digits = 2, fallback = `x${zeroWithDigits(digits)}`) => {
  if (!Number.isFinite(value)) return fallback
  return `x${value.toFixed(digits)}`
}

export const formatCompactMultiplier = (value: number) => {
  if (!Number.isFinite(value)) return "x0"
  if (value >= 100000) return `x${value.toExponential(1).replace("+", "")}`
  if (value >= 10) return `x${value.toFixed(0)}`
  return `x${value.toFixed(2)}`
}

export const formatLargeNumber = (value: LargeNumber, decimals = 2) => {
  if (value.isZero()) return "0"
  return value.toString(decimals)
}

export const formatLargeNumberMultiplier = (value: LargeNumber) => {
  if (value.compare(0) <= 0) return "x0"

  if (value.exponent <= 2) {
    const asNumber = value.mantissa * 10 ** value.exponent
    if (Number.isFinite(asNumber)) {
      if (asNumber < 10) return formatMultiplier(asNumber, 2, "x0")
      if (asNumber < 100) return formatMultiplier(asNumber, 1, "x0")
      if (asNumber < 1000) return formatMultiplier(asNumber, 0, "x0")
    }
  }

  return `x${value.mantissa.toFixed(2)}e${value.exponent}`
}
