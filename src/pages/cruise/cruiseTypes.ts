import cruiseJson from "../../../data/cruise_prestige.json"

export type CruiseNodeId =
  | "prestigeMultiplier"
  | "ticketPrice"
  | "guestSpending"
  | "particleOutput"
  | "maxOfflineTimeCap"
  | "betterReviews"
  | "moreSpace"
  | "echoTriggerCount"
  | "echoMultiplier"

export type CruiseNodeLevels = Record<CruiseNodeId, number>

export type CruiseInputState = {
  prestigesDone: number
  cruiseLevel: number
  ticketPrice: number
  guestSpendingMin: number
  guestSpendingMax: number
  roomCapacityMin: number
  roomCapacityMax: number
}

export type CruiseNodeDefinition = {
  id: CruiseNodeId
  label: string
  maxLevel: number
  minFillsDone: number
  minCruiseLevel: number
}

export const CRUISE_NODE_DEFINITIONS: CruiseNodeDefinition[] = cruiseJson as CruiseNodeDefinition[]

export const emptyCruiseNodeLevels = (): CruiseNodeLevels => {
  return Object.fromEntries(CRUISE_NODE_DEFINITIONS.map((definition) => [definition.id, 0])) as CruiseNodeLevels
}
