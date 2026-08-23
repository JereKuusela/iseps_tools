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

type OutputUpgradeId = `output.${TokenResourceId}`
type SuppliesUpgradeId =
  | `supplies.${Exclude<TokenResourceId, "ixion" | "juno" | "kappa">}`
  | "supplies.tokenBonus"
  | "supplies.crystalBonus"
type BbBotUpgradeId =
  | `bbbot.${Exclude<TokenResourceId, "ixion" | "juno" | "kappa">}`
  | "bbbot.duration"
  | "bbbot.tokenBonus"

export type TokenId = OutputUpgradeId | SuppliesUpgradeId | BbBotUpgradeId

export type CostAnchor = {
  level: number
  cost: number
  step: number
}

export type UpgradeRequirement = {
  id: TokenId
  minLevel: number
}

export type TokenUpgradeDefinition = {
  id: TokenId
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
  upgradeId: TokenId
  level: number
  cost: number
  shortTerm: number
  longTerm: number
}

export type TokenLoadedData = {
  upgrades: TokenUpgradeDefinition[]
  rowByKey: Map<string, TokenLevelRow>
}

export type TokenLevelMap = Record<string, string>
export type TokenToggleMap = Record<string, boolean>

export type TokenInputState = {
  levels: TokenLevelMap
  enabled: TokenToggleMap
  outputLevelsByResource: Record<string, string>
  blendPercent: number
  granularity: string
  onlineHoursPerDay: string
}

export type TokenRecommendationRow = {
  id: TokenId
  currentLevel: number
  nextLevel: number | null
  cost: number
  score: number
}
