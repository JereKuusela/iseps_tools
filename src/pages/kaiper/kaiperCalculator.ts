import type {
  AmpDefinition,
  CostFamily,
  CostReducer,
  KaiperData,
  KappaExponentRule,
  ReducerLevels,
  SequencingEffect,
  StepRule,
} from "./kaiperTypes"

const stepValue = (rule: StepRule) => (rule.exp !== undefined ? rule.exp : Math.log10(rule.mult ?? 1))

export const stepLog10 = (steps: StepRule[], level: number) => {
  let step = 0
  for (const rule of steps) {
    if (rule.from > level) continue
    step = rule.boost ? step + stepValue(rule) : stepValue(rule)
  }
  return step
}

// Cost of buying `level` (1-based) as log10; null when the level is past the known range.
export const costLog10 = (family: CostFamily, level: number): number | null => {
  if (level < 1) return null
  if (family.maxLevel !== undefined && level > family.maxLevel) return null

  let initial = family.initial ?? Number.NaN
  if (family.anchor) {
    let sum = 0
    for (let k = 2; k <= family.anchor.level; k += 1) sum += stepLog10(family.steps, k)
    initial = family.anchor.cost - sum
  }
  if (!Number.isFinite(initial) || (family.anchor === undefined && family.initial === undefined)) return null

  let cost = initial
  for (let k = 2; k <= level; k += 1) {
    const override = family.overrides?.[k]
    cost = override !== undefined ? override : cost + stepLog10(family.steps, k)
  }
  return cost
}

export const reducerLog10 = (reducer: CostReducer, levels: ReducerLevels) => {
  let total = 0
  if (levels.dcmLevel >= reducer.dcm.level) total += Math.log10(reducer.dcm.div)
  total += (levels.ogLevels[reducer.og.id] ?? 0) * Math.log10(reducer.og.div)
  total += (levels.qaLevels[reducer.qa.id] ?? 0) * Math.log10(reducer.qa.div)
  return total
}

export const sumLog10 = (values: number[]) => {
  if (values.length === 0) return Number.NEGATIVE_INFINITY
  const max = Math.max(...values)
  return max + Math.log10(values.reduce((sum, value) => sum + 10 ** (value - max), 0))
}

export const ampUnlocked = (amp: AmpDefinition, se: number) => se >= amp.unlockSe

const ampBaseValue = (amp: AmpDefinition, baseLevel: number) => amp.init + amp.step * baseLevel

const ampExponent = (amp: AmpDefinition, se: number, counterLevel: number) =>
  Math.max(0, se - amp.unlockSe) + counterLevel + 1

export const ampMultiplierLog10 = (amp: AmpDefinition, se: number, baseLevel: number, counterLevel: number) => {
  const base = ampBaseValue(amp, baseLevel)
  return base > 0 ? ampExponent(amp, se, counterLevel) * Math.log10(base) : 0
}

// Gain in log10 of the multiplier from buying the next level.
export const ampNextIncreaseLog10 = (
  amp: AmpDefinition,
  se: number,
  baseLevel: number,
  counterLevel: number,
  kind: "base" | "counter",
) => {
  const base = ampBaseValue(amp, baseLevel)
  if (base <= 0) return 0
  if (kind === "counter") return Math.log10(base)
  const next = ampBaseValue(amp, baseLevel + 1)
  return ampExponent(amp, se, counterLevel) * (Math.log10(next) - Math.log10(base))
}

// log10 of ln(increase) / cost; -Infinity when there is no gain or cost.
export const efficiencyLog10 = (increaseLog10: number, cost: number | null) => {
  if (cost === null || !(increaseLog10 > 0)) return Number.NEGATIVE_INFINITY
  return Math.log10(increaseLog10 * Math.LN10) - cost
}

// Percent of the best entry, null where the entry has no efficiency.
export const relativeEfficiencies = (values: number[]) => {
  const best = Math.max(...values)
  return values.map((value) => (Number.isFinite(value) && Number.isFinite(best) ? 10 ** (value - best) : null))
}

const effectCount = (position: number, effectIndex: number) =>
  Math.floor(position / 5) + (effectIndex < position % 5 ? 1 : 0)

export const sequencingEffectLog10 = (
  effect: SequencingEffect,
  effectIndex: number,
  position: number,
  fill: number,
) => {
  const count = effectCount(position, effectIndex)
  return (
    count * Math.log10(effect.mult) +
    Math.floor(count / effect.every) * Math.log10(effect.bonus) +
    Math.floor(position / 5) * Math.log10(fill)
  )
}

export const sequencingPosition = (kappaLevel: number, cashLevel: number, bundle: boolean, data: KaiperData) =>
  kappaLevel + cashLevel + (bundle ? data.sequencingBundlePositions : 0)

// DC multiplier gained by the purchases up to and including the next DC effect.
export const nextSequencingDcHit = (position: number, data: KaiperData) => {
  const steps = ((5 - (position % 5)) % 5) + 1
  const effectIndex = data.sequencingEffects.findIndex((effect) => effect.id === "dc")
  const effect = data.sequencingEffects[effectIndex]
  const gainLog10 =
    sequencingEffectLog10(effect, effectIndex, position + steps, data.sequencingFill) -
    sequencingEffectLog10(effect, effectIndex, position, data.sequencingFill)
  return { steps, gainLog10 }
}

export const kappaExponentFromRules = (
  rules: KappaExponentRule[],
  ctx: {
    researchLevel: number
    dcmLevel: number
    playerLevel: number
    ogLevels: number[]
    crystals: Record<string, boolean>
  },
) =>
  rules.reduce((total, rule) => {
    switch (rule.type) {
      case "research":
        return ctx.researchLevel >= (rule.level ?? 0) ? total + (rule.exp ?? 0) : total
      case "dcm":
        return ctx.dcmLevel >= (rule.level ?? 0) ? total + (rule.exp ?? 0) : total
      case "player":
        return ctx.playerLevel >= (rule.level ?? 0) ? total + (rule.exp ?? 0) : total
      case "og":
        return total + (ctx.ogLevels[Number(rule.id)] ?? 0) * (rule.expPerLevel ?? 0)
      case "crystal":
        return ctx.crystals[String(rule.id)] ? total + (rule.exp ?? 0) : total
    }
  }, 0)
