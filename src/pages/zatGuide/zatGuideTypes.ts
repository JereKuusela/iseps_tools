import type { LargeNumber } from "../../lib/largeNumber"

export type GuideRunType = "se_push" | "g_points" | "juno" | "cash"

export type GuideNodeAmount = {
  id: number
  amount?: number
}

export type GuideEntry = {
  cycle: number
  run: string
  nodes: GuideNodeAmount[]
  nodeAmounts: Map<number, number>
  note?: string
}

export type GuideNodeView = {
  id: number
  name: string
  info: string
  x: number
  y: number
  req?: number
  maxLv: number
  activeLevel: number
  boost: LargeNumber
  isSingleLevel: boolean
}
