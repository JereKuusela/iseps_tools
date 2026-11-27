import { describe, expect, it } from "vitest"
import { KAIPER_DATA } from "./kaiperData"
import {
  ampMultiplierLog10,
  ampNextIncreaseLog10,
  costLog10,
  efficiencyLog10,
  kappaExponentFromRules,
  nextSequencingDcHit,
  reducerLog10,
  relativeEfficiencies,
  sequencingEffectLog10,
  sequencingPosition,
  stepLog10,
} from "./kaiperCalculator"
import { KAPPA_EXPONENT_RULES } from "./kaiperData"

const amp = (id: string) => KAIPER_DATA.amps.find((entry) => entry.id === id)!
const pod = (particle: string) => KAIPER_DATA.genesisPod.find((entry) => entry.particle === particle)!.family

describe("cost families", () => {
  it("reaches x7.37 DC Kappa step at level 91", () => {
    expect(10 ** stepLog10(KAIPER_DATA.dataCenterKappa.steps, 91)).toBeCloseTo(7.371, 2)
  })

  it("reaches x3.66 Sequencing Kappa step and e9 Cash step at level 41", () => {
    expect(10 ** stepLog10(KAIPER_DATA.sequencingKappa.steps, 41)).toBeCloseTo(3.662, 2)
    expect(stepLog10(KAIPER_DATA.sequencingCash.steps, 41)).toBeCloseTo(9, 6)
  })

  it("makes Alpha pod level 4 cost e6 more than level 3", () => {
    const alpha = pod("alpha")
    expect(costLog10(alpha, 4)! - costLog10(alpha, 3)!).toBeCloseTo(6, 6)
  })

  it("uses the Helion level 2 override", () => {
    const helion = pod("helion")
    expect(costLog10(helion, 1)).toBeCloseTo(701, 6)
    expect(costLog10(helion, 2)).toBeCloseTo(757 + Math.log10(2), 6)
  })

  it("steps amp base cost x2 in level 2..5 and x4 from level 6", () => {
    const cash = amp("cash").base
    expect(costLog10(cash, 1)).toBeCloseTo(Math.log10(50), 6)
    expect(costLog10(cash, 2)! - costLog10(cash, 1)!).toBeCloseTo(Math.log10(2), 6)
    expect(costLog10(cash, 6)! - costLog10(cash, 5)!).toBeCloseTo(Math.log10(4), 6)
  })

  it("caps Genesis Pods at level 75 and leaves other families uncapped", () => {
    expect(costLog10(pod("alpha"), 75)).not.toBeNull()
    expect(costLog10(pod("alpha"), 76)).toBeNull()
    expect(costLog10(amp("cash").counter, 100)).not.toBeNull()
    expect(costLog10(KAIPER_DATA.sequencingCash, 100)).not.toBeNull()
  })

  it("anchors research costs to the known level", () => {
    expect(costLog10(amp("research").base, 50)).toBeCloseTo(Math.log10(2.86) + 98, 6)
  })
})

describe("reducers", () => {
  it("applies flat DCM and per-level OG/QA divisors", () => {
    const ogLevels = Array.from({ length: 20 }, () => 0)
    ogLevels[16] = 10
    const value = reducerLog10(KAIPER_DATA.reducers.amps, { dcmLevel: 106, ogLevels, qaLevels: { 21: 2 } })
    expect(value).toBeCloseTo(Math.log10(1.5) + 10 * Math.log10(1.01) + 2 * Math.log10(1.1), 9)
    expect(reducerLog10(KAIPER_DATA.reducers.amps, { dcmLevel: 105, ogLevels: [], qaLevels: {} })).toBe(0)
  })
})

describe("amplifiers", () => {
  it("computes multiplier and increases", () => {
    const cash = amp("cash")
    expect(ampMultiplierLog10(cash, 150, 0, 0)).toBeCloseTo(6 * Math.log10(1.3), 9)
    expect(ampNextIncreaseLog10(cash, 150, 0, 0, "counter")).toBeCloseTo(Math.log10(1.3), 9)
    expect(ampNextIncreaseLog10(cash, 150, 0, 0, "base")).toBeCloseTo(6 * Math.log10(1.4 / 1.3), 9)
  })

  it("treats placeholder amps as no gain", () => {
    expect(ampNextIncreaseLog10(amp("research"), 200, 0, 0, "base")).toBe(0)
    expect(efficiencyLog10(0, 10)).toBe(Number.NEGATIVE_INFINITY)
  })

  it("normalizes efficiencies to the best", () => {
    const [a, b, c] = relativeEfficiencies([1, 0, Number.NEGATIVE_INFINITY])
    expect(a).toBe(1)
    expect(b).toBeCloseTo(0.1, 9)
    expect(c).toBeNull()
  })
})

describe("sequencing", () => {
  const { sequencingEffects: effects, sequencingFill: fill } = KAIPER_DATA
  const dc = effects[0]

  it("cycles effects and gives the Nth bonus", () => {
    expect(10 ** sequencingEffectLog10(dc, 0, 1, fill)).toBeCloseTo(1.03, 9)
    expect(10 ** sequencingEffectLog10(dc, 0, 11, fill)).toBeCloseTo(1.03 ** 3 * 1.15 * 1.01 ** 2, 9)
  })

  it("finds the next DC hit", () => {
    expect(nextSequencingDcHit(0, KAIPER_DATA).steps).toBe(1)
    expect(nextSequencingDcHit(1, KAIPER_DATA).steps).toBe(5)
  })

  it("counts the bundle as one full cycle", () => {
    expect(sequencingPosition(2, 1, true, KAIPER_DATA)).toBe(8)
    expect(sequencingPosition(2, 1, false, KAIPER_DATA)).toBe(3)
  })
})

describe("kappa exponent", () => {
  it("sums level, per-level and crystal sources", () => {
    const ogLevels = Array.from({ length: 20 }, () => 0)
    ogLevels[19] = 2
    const total = kappaExponentFromRules(KAPPA_EXPONENT_RULES, {
      researchLevel: 131,
      dcmLevel: 104,
      playerLevel: 0,
      ogLevels,
      crystals: { "bundle.meltdown": true },
    })
    expect(total).toBeCloseTo(0.001 + 0.005 + 0.005 + 0.01 + 0.005, 9)
  })
})
