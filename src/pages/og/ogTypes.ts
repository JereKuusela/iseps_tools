import { LargeNumber } from "../../lib/largeNumber"

export type GainUnit = "sec" | "min" | "hour"

export type RankedTech = {
  id: number
  level: number
  score: number
  rawValue: number
  cost: LargeNumber
  etaSeconds: number
}

export type TopTechEntry = RankedTech & {
  relative: number
}

export type TechCardRow = {
  id: number
  label: string
  level: number
  relative: number
  etaSeconds: number
  nextCost: string
}

export type ExponentGainEntry = {
  delta: number
  multiplier: number
}
