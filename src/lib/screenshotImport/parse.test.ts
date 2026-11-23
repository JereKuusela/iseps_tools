import { describe, expect, it } from "vitest"
import { classifyCheck, parseLevelText } from "./parse"

describe("parseLevelText", () => {
  it("reads two-line and single-line values", () => {
    expect(parseLevelText("300\n/300", 300)).toEqual({ level: 300, status: "ok" })
    expect(parseLevelText("5 /5", 5)).toEqual({ level: 5, status: "ok" })
    expect(parseLevelText("1,000\n/1,000", 1000)).toEqual({ level: 1000, status: "ok" })
  })

  it("flags a max that does not match the expected one", () => {
    expect(parseLevelText("95\n/96", 95)).toMatchObject({ level: 95, status: "low" })
  })

  it("recovers when the slash is read as a digit or dropped", () => {
    expect(parseLevelText("1035/1800", 1800)).toMatchObject({ level: 1035, status: "ok" })
    expect(parseLevelText("103511800", 1800)).toMatchObject({ level: 1035, status: "low" })
    expect(parseLevelText("1035 1800", 1800)).toMatchObject({ level: 1035, status: "ok" })
  })

  it("clamps values above max and reports empty reads", () => {
    expect(parseLevelText("900/500", 500)).toMatchObject({ level: 500, status: "low" })
    expect(parseLevelText("", 500)).toMatchObject({ status: "unknown" })
  })
})

describe("classifyCheck", () => {
  it("detects green and gray patches", () => {
    expect(classifyCheck([50, 160, 60])).toEqual({ level: 1, status: "ok" })
    expect(classifyCheck([40, 42, 44])).toEqual({ level: 0, status: "ok" })
    expect(classifyCheck([150, 90, 40])).toMatchObject({ level: 0, status: "low" })
  })
})
