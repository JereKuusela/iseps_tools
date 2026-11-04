import { LargeNumber } from "./largeNumber"

export const parseNumberish = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

export const toInt = (value: unknown) => Math.max(0, Math.floor(parseNumberish(value)))

// Accepts large-number notation beyond Number range and clamps negatives to 0.
export const parseLargeNumberish = (value: string) => {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return parsed

  try {
    const large = LargeNumber.parse(value)
    if (large.compare(0) <= 0) return 0
    if (large.exponent > 308) return Number.MAX_VALUE
    return large.mantissa * 10 ** large.exponent
  } catch {
    return 0
  }
}
