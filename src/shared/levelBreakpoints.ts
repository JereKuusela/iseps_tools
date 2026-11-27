// Shared numeric levels (player, DCM, research) are stored raw; each page only shows its own breakpoints.
export const resolvePreviousLevel = (breakpoints: number[], current: number) => {
  const sorted = [...breakpoints].sort((a, b) => a - b)
  let resolved = sorted[0] ?? 0
  for (const level of sorted) {
    if (level > current) break
    resolved = level
  }
  return resolved
}

// Moving down keeps the stored value just below the next breakpoint so other pages' breakpoints survive.
export const selectLevel = (breakpoints: number[], current: number, selected: number) => {
  const resolved = resolvePreviousLevel(breakpoints, current)
  if (selected === resolved) return current
  if (selected > resolved) return selected

  const nextBreakpoint = [...breakpoints].sort((a, b) => a - b).find((level) => level > selected)
  return nextBreakpoint === undefined ? selected : nextBreakpoint - 1
}
