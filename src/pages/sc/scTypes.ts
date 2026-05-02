import type { LargeNumber } from "../../lib/largeNumber"
import type { ScGoalType } from "../../lib/scCalculator"

export type PanelOutput = {
  id: number
  goalType: ScGoalType
  goalTypeLabel: string
  customGoal: string
  dcCost: LargeNumber
  progressPct: number
  totalMinutes: number
  remainingMinutes: number
  afterSkipsMinutes: number
  projectedProgressPct: number
  projectedDcCost: LargeNumber
  projectedScGained: LargeNumber
  projectedDailyBoost: number
  projectedScReplicator: number
  projectedDcReplicator: number
}

export type ScGoalOption = {
  value: ScGoalType
  label: string
}
