export type TokenUpgradeGroup = "output" | "supplies" | "bbbot" | "special"

export type TokenResourceId =
  | "cash"
  | "alpha"
  | "beta"
  | "ceti"
  | "delta"
  | "epsilon"
  | "fenix"
  | "gamma"
  | "helion"
  | "juno"
  | "kappa"
  | "ixion"

export const OUTPUT_RESOURCES: TokenResourceId[] = [
  "cash",
  "alpha",
  "beta",
  "ceti",
  "delta",
  "epsilon",
  "fenix",
  "gamma",
  "helion",
  "ixion",
  "juno",
  "kappa",
]

export const SUPPLY_RESOURCES: TokenResourceId[] = [
  "cash",
  "alpha",
  "beta",
  "ceti",
  "delta",
  "epsilon",
  "fenix",
  "gamma",
  "helion",
]

export const BBBOT_RESOURCES: TokenResourceId[] = [...SUPPLY_RESOURCES]

export type CostAnchor = {
  level: number
  cost: number
  step: number
}

export type UpgradeRequirement = {
  id: string
  minLevel: number
}

export type TokenUpgradeDefinition = {
  id: string
  label: string
  group: TokenUpgradeGroup
  resource?: TokenResourceId
  maxLevel: number
  baseValue?: number
  baseline?: number
  requires?: UpgradeRequirement
  costAnchors: CostAnchor[]
}

export type TokenUpgradeDefinitionDocument = {
  upgrades: TokenUpgradeDefinition[]
}

export type TokenLevelRow = {
  upgradeId: string
  level: number
  cost: number
  shortTerm: number
  longTerm: number
}

export type TokenTargetRow = {
  level: number
  weights: Partial<Record<TokenResourceId, number>>
}

export type TokenLoadedData = {
  upgrades: TokenUpgradeDefinition[]
  rowByKey: Map<string, TokenLevelRow>
  targetRows: TokenTargetRow[]
}

export type TokenLevelMap = Record<string, string>
export type TokenToggleMap = Record<string, boolean>

export type TokenInputState = {
  levels: TokenLevelMap
  enabled: TokenToggleMap
  outputLevelsByResource: Record<string, string>
  blendPercent: string
  granularity: string
  onlineHoursPerDay: string
  alphaSuppliesLevel: string
  junoOutputLevel: string
}

export type TokenRecommendationRow = {
  id: string
  label: string
  group: TokenUpgradeGroup
  resource?: TokenResourceId
  currentLevel: number
  nextLevel: number | null
  maxLevel: number
  cost: number
  shortTermValue: number
  longTermValue: number
  weightedValue: number
  score: number
  projectedTimeSeconds: number | null
  projectionReady: boolean
}
