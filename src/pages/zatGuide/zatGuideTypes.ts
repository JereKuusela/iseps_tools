import type { LargeNumber } from "../../lib/largeNumber"
import type { GuideNode } from "../../shared/zatGuideNodes"

export type GuideRunType = "se" | "grun" | "jrun" | "crun"

export type GuideEntry = {
  cycle: number
  run: string
  nodes: GuideNode[]
  nodeAmounts: Map<string, number>
  note?: string
}

export type GuideNodeView = {
  id: string
  name: string
  info: string
  x: number
  y: number
  req?: string
  maxLv: number
  activeLevel: number
  boost: LargeNumber
  isSingleLevel: boolean
}
