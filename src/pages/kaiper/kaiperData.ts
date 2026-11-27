import upgradesJson from "../../../data/kaiper_upgrades.json"
import exponentJson from "../../../data/kappa_exponent.json"
import premiumJson from "../../../data/kappa_premium.json"
import { parseLargeNumberSafe } from "../../lib/largeNumber"
import { log10Of } from "../../lib/eta"
import type { PremiumRule } from "../../shared/zatCalculator"
import type { CostFamily, KaiperData, KappaExponentRule, StepRule } from "./kaiperTypes"

const toLog10 = (raw: string) => log10Of(parseLargeNumberSafe(raw))

type RawFamily = {
  initial?: string
  anchor?: { level: number; cost: string }
  steps: StepRule[]
  maxLevel?: number
  overrides?: Record<string, string>
}

const family = (raw: RawFamily): CostFamily => ({
  initial: raw.initial ? toLog10(raw.initial) : undefined,
  anchor: raw.anchor ? { level: raw.anchor.level, cost: toLog10(raw.anchor.cost) } : undefined,
  steps: raw.steps,
  maxLevel: raw.maxLevel,
  overrides: raw.overrides
    ? Object.fromEntries(Object.entries(raw.overrides).map(([level, cost]) => [Number(level), toLog10(cost)]))
    : undefined,
})

const json = upgradesJson

const buildData = (): KaiperData => ({
  amps: json.amps.items.map((item) => {
    const raw = item as typeof item & {
      baseCost?: string
      counterCost?: string
      baseAnchor?: { level: number; cost: string }
      counterAnchor?: { level: number; cost: string }
    }
    return {
      id: item.id,
      label: item.label,
      init: item.init,
      step: item.step,
      unlockSe: item.unlockSe,
      base: family({ initial: raw.baseCost, anchor: raw.baseAnchor, steps: json.amps.baseSteps }),
      counter: family({
        initial: raw.counterCost,
        anchor: raw.counterAnchor,
        steps: json.amps.counterSteps,
      }),
    }
  }),
  genesisPod: json.genesisPod.items.map((item) => {
    const step = toLog10(item.step)
    const overrides = (item as { overrides?: Record<string, string> }).overrides
    return {
      particle: item.particle,
      family: family({
        initial: item.initial,
        steps: [{ from: 2, exp: step }, ...json.genesisPod.steps],
        maxLevel: json.genesisPod.maxLevel,
        overrides,
      }),
    }
  }),
  dataCenter: json.dataCenter.items.map((item) => ({
    particle: item.particle,
    family: family({ initial: item.initial, steps: json.dataCenter.steps }),
  })),
  dataCenterKappa: family(json.dataCenter.kappa),
  kappaLevelDcMultiplier: json.dataCenter.kappaLevelDcMultiplier,
  otherLevelDcMultiplier: json.dataCenter.otherLevelDcMultiplier,
  sequencingKappa: family(json.sequencing.kappa),
  sequencingCash: family(json.sequencing.cash),
  sequencingEffects: json.sequencing.effects,
  sequencingFill: json.sequencing.fillMultiplier,
  sequencingBundlePositions: json.sequencing.bundlePositions,
  reducers: {
    amps: json.costReducers.amps,
    podAndDc: json.costReducers.podAndDc,
    sequencing: json.costReducers.sequencing,
  },
})

export const KAIPER_DATA: KaiperData = buildData()
export const KAPPA_EXPONENT_RULES = exponentJson as KappaExponentRule[]
export const KAPPA_PREMIUM_RULES = premiumJson as PremiumRule[]

const REDUCER_LABELS = { amps: "Amplifier", podAndDc: "Pod + DC", sequencing: "Sequencing" } as const

// Breakpoints that matter for Kaiper, with their effects as the dropdown label.
const buildLevelOptions = (type: "dcm" | "research") => {
  const effects = new Map<number, string[]>()
  const add = (level: number, text: string) => effects.set(level, [...(effects.get(level) ?? []), text])

  for (const rule of KAPPA_EXPONENT_RULES) {
    if (rule.type === type && rule.level !== undefined) add(rule.level, `+${rule.exp?.toFixed(3)} exp`)
  }
  if (type === "dcm") {
    for (const [key, label] of Object.entries(REDUCER_LABELS)) {
      const reducer = KAIPER_DATA.reducers[key as keyof typeof REDUCER_LABELS]
      add(reducer.dcm.level, `${label} cost /${reducer.dcm.div}`)
    }
  }

  return [
    { value: "0", label: "0" },
    ...[...effects.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, texts]) => ({ value: String(level), label: `${level} (${texts.join(", ")})` })),
  ]
}

export const DCM_LEVEL_OPTIONS = buildLevelOptions("dcm")
export const RESEARCH_LEVEL_OPTIONS = buildLevelOptions("research")
