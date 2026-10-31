import { createContext, type ParentProps, useContext, type Accessor } from "solid-js"
import cyclesJson from "../../data/cycles.json"
import junoExponentJson from "../../data/juno_exponent.json"
import junoPremiumJson from "../../data/juno_premium.json"
import premiumJson from "../../data/premium.json"
import techsJson from "../../data/techs.json"
import techsSeEffectJson from "../../data/techs_se_effect.json"
import zatGuidesJson from "../../data/zat_guides.json"
import zatNodesJson from "../../data/zat_nodes.json"
import { buildGuideNodeAmountMap, parseGuideNodes } from "./zatGuideNodes"

export type CycleRule = {
  cycle: number
  mult: number
}

export type JunoExponentType = "qa" | "se" | "player" | "research" | "dcm" | "crystal"

export type JunoExponentRule = {
  type: JunoExponentType
  level: number
  exp: number
}

export type JunoPremiumRule = {
  name: string
  min?: number
  max?: number
  value: number
  mode: "add" | "mul"
}

export type TechCostCurveRule = {
  level: number
  mult: number
  single?: number
}

export type TechRule = {
  id: number
  initCost: number
  costCurve: TechCostCurveRule[]
  maxLevel: number
  dcBoost?: number
  junoBase?: number
  extraJunoBase?: number
  extraJunoExp?: number
  seMultiplier?: number
  seAdditive?: number
  tooltip: string
}

export type TechSeEffectRule = {
  se: number
  kind: "mul" | "div"
  value: number
}

export type ZatNodeRule = {
  id: string
  name: string
  info: string
  maxLv?: number
  cost?: number
  techMul: number
  shareMul?: number
  junoMul?: number
  dcMul?: number
  sqrt?: boolean
  x: number
  y: number
  req?: string
}

type ZatGuideJson = {
  cycle: number
  run: string
  title?: string
  nodes: Array<{
    id: string
    amount?: number
  }>
  note?: string
}

export type ZatGuideEntry = {
  cycle: number
  run: string
  title: string
  nodes: Map<string, number>
  note: string
}

export type PremiumCrystalTokenMethod = {
  id: string
  name: string
  seconds: number
  tokens: number
  crystals: number
  tokenBooster?: boolean
  chestEnhancer?: boolean
  luckyLeafClover?: boolean
  tokenUpgradePerLevel?: number
  crystalUpgradePerLevel?: number
  durationTokenPerLevel?: number
  tokenUpgradeUnlockLevel?: number
}

export type PremiumSeDailyMultiplier = {
  se: number
  mult: number
}

export type PremiumCrystalTokenData = {
  dailyRewards: {
    tokens: number
    crystals: number
  }
  seDailyTokenMultipliers: PremiumSeDailyMultiplier[]
  methods: PremiumCrystalTokenMethod[]
}

export type PremiumHaulerLayer = {
  layer: number
  rareDirt?: number
  tokens?: number
  crystals?: number
  exoticDirt?: number
  rareDirtBonus?: number
  tokenToggle?: string
  crystalToggle?: string
  exoticToggle?: string
  rareBonusToggle?: string
}

export type PremiumHaulerMineData = {
  layerHours: number
  layers: PremiumHaulerLayer[]
}

export type PremiumDataBundle = {
  crystalToken: PremiumCrystalTokenData
  haulerMine: PremiumHaulerMineData
}

export type ZatDataBundle = {
  cycles: CycleRule[]
  junoExponent: JunoExponentRule[]
  junoPremium: JunoPremiumRule[]
  premium: PremiumDataBundle
  techs: TechRule[]
  techsSeEffect: TechSeEffectRule[]
  zatGuides: ZatGuideEntry[]
  zatNodes: ZatNodeRule[]
}

const junoExponent = (
  junoExponentJson as Array<{
    type?: JunoExponentType
    level?: number
    "level:"?: number
    exp?: number
  }>
)
  .map((entry) => ({
    type: entry.type ?? "se",
    level: typeof entry.level === "number" ? entry.level : (entry["level:"] ?? 0),
    exp: entry.exp ?? 0,
  }))
  .sort((a, b) => a.level - b.level)

const zatGuides = (zatGuidesJson as ZatGuideJson[]).map((entry) => {
  const nodes = buildGuideNodeAmountMap(parseGuideNodes(entry.nodes))
  return {
    cycle: entry.cycle,
    run: entry.run,
    title: entry.title?.trim() ?? "",
    nodes,
    note: entry.note ?? "",
  }
})

const dataBundle: ZatDataBundle = {
  cycles: (cyclesJson as CycleRule[]).slice(),
  junoExponent,
  junoPremium: (junoPremiumJson as JunoPremiumRule[]).slice(),
  premium: premiumJson as PremiumDataBundle,
  techs: (techsJson as TechRule[]).slice().sort((a, b) => a.id - b.id),
  techsSeEffect: (techsSeEffectJson as TechSeEffectRule[]).slice(),
  zatGuides,
  zatNodes: (zatNodesJson as ZatNodeRule[]).slice(),
}

const ZatDataContext = createContext<Accessor<ZatDataBundle>>()

export const ZatDataProvider = (props: ParentProps) => {
  const accessor = () => dataBundle
  return <ZatDataContext.Provider value={accessor}>{props.children}</ZatDataContext.Provider>
}

export const useZatData = (): Accessor<ZatDataBundle> => {
  const context = useContext(ZatDataContext)
  if (!context) {
    throw new Error("useZatData must be used inside ZatDataProvider")
  }
  return context
}
