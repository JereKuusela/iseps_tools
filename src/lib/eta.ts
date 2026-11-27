import { LargeNumber } from "./largeNumber"

export const estimateSeconds = (cost: LargeNumber, current: LargeNumber, gainPerSecond: LargeNumber) => {
  if (gainPerSecond.compare(0) <= 0) return Number.POSITIVE_INFINITY
  if (cost.compare(current) <= 0) return 0

  const remaining = cost.subtract(current).divide(gainPerSecond)
  if (remaining.exponent > 12) return Number.POSITIVE_INFINITY
  return remaining.mantissa * 10 ** remaining.exponent
}

export const log10Of = (value: LargeNumber) =>
  value.isZero() ? Number.NEGATIVE_INFINITY : Math.log10(Math.abs(value.mantissa)) + value.exponent

export const fromLog10 = (log10: number) => {
  const floor = Math.floor(log10)
  return new LargeNumber(10 ** (log10 - floor), floor)
}
