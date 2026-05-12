export type GainUnit = "sec" | "min" | "hour"

export type TopTechEntry = {
  id: number
  level: number
  score: number
  relative: number
  etaSeconds: number
}

export type TechCardRow = {
  id: number
  label: string
  level: number
  maxLevel: number
  nextLevel: number | null
  relative: number
  etaSeconds: number
  nextCost: string
}

export type ExponentGainEntry = {
  delta: number
  multiplier: number
}
