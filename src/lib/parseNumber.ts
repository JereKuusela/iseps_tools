export const parseNumberish = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

export const toInt = (value: unknown) => Math.max(0, Math.floor(parseNumberish(value)))
