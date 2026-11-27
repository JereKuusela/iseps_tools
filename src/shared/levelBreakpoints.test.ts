import { describe, expect, it } from "vitest"
import { resolvePreviousLevel, selectLevel } from "./levelBreakpoints"

const breakpoints = [0, 89, 104, 106]

describe("level breakpoints", () => {
  it("shows the highest breakpoint at or below the stored value", () => {
    expect(resolvePreviousLevel(breakpoints, 105)).toBe(104)
    expect(resolvePreviousLevel(breakpoints, 200)).toBe(106)
  })

  it("keeps the stored value when the shown breakpoint is re-selected", () => {
    expect(selectLevel(breakpoints, 110, 106)).toBe(110)
  })

  it("moves up to the selected breakpoint", () => {
    expect(selectLevel(breakpoints, 90, 106)).toBe(106)
  })

  it("moves down to just below the next breakpoint", () => {
    expect(selectLevel(breakpoints, 110, 89)).toBe(103)
  })
})
