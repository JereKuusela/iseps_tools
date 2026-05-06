import { createContext, createMemo, type ParentProps, useContext } from "solid-js"
import { LargeNumber } from "../../lib/largeNumber"
import { createPersistedSignal } from "../../lib/persistedSignal"
import { useZatData, type JunoExponentType } from "../../lib/zatContext"
import {
  calculateExponentIncreaseMultipliers,
  calculateNextThreeTechCosts,
  calculateSeEffect,
  calculateTechBoost,
  calculateTotalPremiumMultiplier,
  calculateZatBoostPerTech,
  type ZatMode,
} from "../../lib/zatCalculator"
import type { ExponentGainEntry, GainUnit, RankedTech, TechCardRow, TopTechEntry } from "./ogTypes"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const toRatePerSecond = (value: number, unit: GainUnit) => {
  if (unit === "min") return value / 60
  if (unit === "hour") return value / 3600
  return value
}

const parseLargeNumberSafe = (value: string): LargeNumber => {
  try {
    return LargeNumber.parse(value.trim() === "" ? "0" : value)
  } catch {
    return LargeNumber.zero()
  }
}

const estimateSeconds = (cost: LargeNumber, current: LargeNumber, gainPerSecond: number) => {
  if (gainPerSecond <= 0) return Number.POSITIVE_INFINITY
  if (cost.compare(current) <= 0) return 0

  const remaining = cost.subtract(current).divide(gainPerSecond)
  if (remaining.exponent > 12) return Number.POSITIVE_INFINITY
  return remaining.mantissa * 10 ** remaining.exponent
}

const logScore = (value: number, cost: LargeNumber) => {
  const safeValue = Math.max(value, Number.EPSILON)
  return Math.log(safeValue) - (Math.log(Math.max(cost.mantissa, Number.EPSILON)) + cost.exponent * Math.log(10))
}

type BestTech = {
  id: number
  level: number
  etaSeconds: number
} | null

type OgTechContextValue = {
  cycles: () => string
  setCycles: (next: string) => string
  gainValue: () => string
  setGainValue: (next: string) => string
  gainUnit: () => GainUnit
  setGainUnit: (next: GainUnit) => GainUnit
  junoAmount: () => string
  setJunoAmount: (next: string) => string
  mode: () => ZatMode
  setMode: (next: ZatMode) => ZatMode
  junoOutput: () => string
  setJunoOutput: (next: string) => string
  junoBundle: () => boolean
  setJunoBundle: (checked: boolean) => boolean
  ixionJunoBundle: () => boolean
  setIxionJunoBundle: (checked: boolean) => boolean
  junoKappaBundle: () => boolean
  setJunoKappaBundle: (checked: boolean) => boolean
  tokens: () => string
  setTokens: (next: string) => string
  premiumMultiplier: () => number
  sharesPercent: () => string
  setSharesPercent: (next: string) => string
  extraExponent: () => string
  setExtraExponent: (next: string) => string
  autoExtraExponent: () => number
  totalExtraExponent: () => number
  seLevel: () => string
  setSeLevel: (next: string) => string
  playerLevel: () => string
  setPlayerLevel: (next: string) => string
  dcmLevel: () => string
  setDcmLevel: (next: string) => string
  researchLevel: () => string
  setResearchLevel: (next: string) => string
  meltdownBundle: () => boolean
  setMeltdownBundle: (checked: boolean) => boolean
  quantumAddon0: () => boolean
  setQuantumAddon0: (checked: boolean) => boolean
  totalTechLevels: () => number
  totalExponent: () => number
  exponentGainEntries: () => ExponentGainEntry[]
  bestTech: () => BestTech
  topFive: () => TopTechEntry[]
  techCardRows: () => TechCardRow[]
  buyNextBest: () => void
  buyNextForTech: (id: number) => void
  setTechLevel: (id: number, next: number) => void
  autoBuyUnderHour: () => void
  autoBuyUnderDay: () => void
  clearTechLevels: () => void
}

const OgTechContext = createContext<OgTechContextValue>()

export const OgTechProvider = (props: ParentProps) => {
  const data = useZatData()

  const [cycles, setCycles] = createPersistedSignal("zat.og.cycles", "0")
  const [gainValue, setGainValue] = createPersistedSignal("zat.og.gain", "1e12")
  const [gainUnit, setGainUnit] = createPersistedSignal<GainUnit>("zat.og.gainUnit", "sec")
  const [junoAmount, setJunoAmount] = createPersistedSignal("zat.og.junoAmount", "1e13")
  const [mode, setMode] = createPersistedSignal<ZatMode>("zat.og.mode", "juno")

  const [junoOutput, setJunoOutput] = createPersistedSignal("zat.og.junoOutput", "0")
  const [junoBundle, setJunoBundle] = createPersistedSignal("zat.og.bundle.juno", false)
  const [ixionJunoBundle, setIxionJunoBundle] = createPersistedSignal("zat.og.bundle.ixion", false)
  const [junoKappaBundle, setJunoKappaBundle] = createPersistedSignal("zat.og.bundle.kappa", false)
  const [tokens, setTokens] = createPersistedSignal("zat.og.tokens", "0")

  const [sharesPercent, setSharesPercent] = createPersistedSignal("zat.guide.shares", "0")

  const [extraExponent, setExtraExponent] = createPersistedSignal("zat.og.extraExponent", "0.001")
  const [seLevel, setSeLevel] = createPersistedSignal("zat.og.seLevel", "0")
  const [playerLevel, setPlayerLevel] = createPersistedSignal("zat.og.playerLevel", "0")
  const [dcmLevel, setDcmLevel] = createPersistedSignal("zat.og.dcmLevel", "0")
  const [researchLevel, setResearchLevel] = createPersistedSignal("zat.og.researchLevel", "0")
  const [meltdownBundle, setMeltdownBundle] = createPersistedSignal("zat.og.meltdown", false)
  const [quantumAddon0, setQuantumAddon0] = createPersistedSignal("zat.og.qa0", false)

  const [techLevels, setTechLevels] = createPersistedSignal<number[]>(
    "zat.og.techLevels",
    Array.from({ length: data().techs.length }, () => 0),
  )

  const gainPerSecond = createMemo(() => {
    return Math.max(0, toRatePerSecond(parseNumberish(gainValue()), gainUnit()))
  })

  const currentJuno = createMemo(() => parseLargeNumberSafe(junoAmount()))
  const seEffect = createMemo(() => calculateSeEffect(parseNumberish(seLevel())))
  const zatBoost = createMemo(() => calculateZatBoostPerTech(parseNumberish(cycles()), mode()))

  const premiumMultiplier = createMemo(() => {
    return calculateTotalPremiumMultiplier({
      "Juno Output": parseNumberish(junoOutput()),
      "Juno Bundle": junoBundle(),
      "Ixion Juno Bundle": ixionJunoBundle(),
      "Juno Kappa Bundle": junoKappaBundle(),
      tokens: parseNumberish(tokens()),
    })
  })

  const autoExtraExponent = createMemo(() => {
    const levelsByType: Record<JunoExponentType, number> = {
      se: parseNumberish(seLevel()),
      player: parseNumberish(playerLevel()),
      research: parseNumberish(researchLevel()),
      dcm: parseNumberish(dcmLevel()),
      qa: quantumAddon0() ? 1 : 0,
      crystal: 1,
    }

    return data().junoExponent.reduce((total, rule) => {
      const current = levelsByType[rule.type] ?? 0
      return current >= rule.level ? total + rule.exp : total
    }, 0)
  })

  const totalExtraExponent = createMemo(() => {
    const manualExtra = Math.max(0, parseNumberish(extraExponent()))
    return manualExtra + autoExtraExponent()
  })

  const og0Level = createMemo(() => techLevels()[0] ?? 0)
  const totalExponent = createMemo(() => {
    const meltdown = meltdownBundle() ? 0.005 : 0
    return 0.01 + totalExtraExponent() + og0Level() * 0.01 + meltdown
  })

  const exponentGainEntries = createMemo(() => {
    return calculateExponentIncreaseMultipliers(
      gainPerSecond(),
      Math.max(totalExponent(), 0.001),
      premiumMultiplier(),
      [0.01, 0.005, 0.001],
    )
  })

  const rankedTechs = createMemo<RankedTech[]>(() => {
    const current = currentJuno()
    const gain = gainPerSecond()
    const levels = techLevels()

    const ranked: RankedTech[] = []

    for (const tech of data().techs) {
      const currentLevel = levels[tech.id] ?? 0
      const nextThree = calculateNextThreeTechCosts(tech.id, currentLevel)
      const techBoost = calculateTechBoost(zatBoost(), seEffect(), tech.id, mode())

      for (const option of nextThree) {
        const score = logScore(techBoost.finalBoost, option.cost)
        ranked.push({
          id: tech.id,
          level: option.level,
          score,
          rawValue: techBoost.finalBoost,
          cost: option.cost,
          etaSeconds: estimateSeconds(option.cost, current, gain),
        })
      }
    }

    return ranked.sort((a, b) => b.score - a.score)
  })

  const bestTech = createMemo<BestTech>(() => rankedTechs()[0] ?? null)

  const topFive = createMemo<TopTechEntry[]>(() => {
    const all = rankedTechs()
    if (all.length === 0) return []
    const best = all[0].score

    return all.slice(1, 6).map((entry) => ({
      ...entry,
      relative: Math.max(0, Math.min(100, Math.exp(entry.score - best) * 100)),
    }))
  })

  const techCardRows = createMemo<TechCardRow[]>(() => {
    const levels = techLevels()
    const ranked = rankedTechs()
    const bestScore = ranked[0]?.score ?? 0

    return data().techs.map((tech) => {
      const currentLevel = levels[tech.id] ?? 0
      const next = calculateNextThreeTechCosts(tech.id, currentLevel)[0]
      const boost = calculateTechBoost(zatBoost(), seEffect(), tech.id, mode())
      const score = next ? logScore(boost.finalBoost, next.cost) : Number.NEGATIVE_INFINITY

      return {
        id: tech.id,
        label: `OG${tech.id}`,
        maxLevel: tech.maxLevel,
        level: currentLevel,
        nextLevel: next ? next.level : null,
        relative: ranked.length > 0 ? Math.max(0, Math.min(100, Math.exp(score - bestScore) * 100)) : 0,
        etaSeconds: next ? estimateSeconds(next.cost, currentJuno(), gainPerSecond()) : Number.POSITIVE_INFINITY,
        nextCost: next ? next.cost.toString(2) : "-",
      }
    })
  })

  const totalTechLevels = createMemo(() => techLevels().reduce((sum, value) => sum + value, 0))

  const setTechLevel = (id: number, next: number) => {
    setTechLevels((current) => {
      const updated = current.slice()
      const maxLevel = data().techs[id]?.maxLevel ?? Number.POSITIVE_INFINITY
      updated[id] = Math.min(maxLevel, Math.max(0, Math.floor(next)))
      return updated
    })
  }

  const buyNextForTech = (id: number) => {
    const currentLevel = techLevels()[id] ?? 0
    const next = calculateNextThreeTechCosts(id, currentLevel)[0]
    if (!next) return
    setTechLevel(id, next.level)
  }

  const buyNextBest = () => {
    const best = bestTech()
    if (!best) return
    setTechLevel(best.id, best.level)
  }

  const autoBuyUnderLimit = (thresholdSeconds: number) => {
    const updatedLevels = techLevels().slice()
    const current = currentJuno()
    const gain = gainPerSecond()

    if (gain <= 0) return

    let foundInPass = false
    let iterations = 0
    const maxIterations = 10_000

    do {
      foundInPass = false

      for (const tech of data().techs) {
        const currentLevel = updatedLevels[tech.id] ?? 0
        const next = calculateNextThreeTechCosts(tech.id, currentLevel)[0]
        if (!next) continue

        const etaSeconds = estimateSeconds(next.cost, current, gain)
        if (etaSeconds <= thresholdSeconds) {
          updatedLevels[tech.id] = next.level
          foundInPass = true
        }
      }

      iterations += 1
      if (iterations >= maxIterations) break
    } while (foundInPass)

    setTechLevels(updatedLevels)
  }

  const autoBuyUnderHour = () => {
    autoBuyUnderLimit(3600)
  }

  const autoBuyUnderDay = () => {
    autoBuyUnderLimit(86400)
  }

  const clearTechLevels = () => {
    setTechLevels(Array.from({ length: data().techs.length }, () => 0))
  }

  return (
    <OgTechContext.Provider
      value={{
        cycles,
        setCycles,
        gainValue,
        setGainValue,
        gainUnit,
        setGainUnit,
        junoAmount,
        setJunoAmount,
        mode,
        setMode,
        junoOutput,
        setJunoOutput,
        junoBundle,
        setJunoBundle,
        ixionJunoBundle,
        setIxionJunoBundle,
        junoKappaBundle,
        setJunoKappaBundle,
        tokens,
        setTokens,
        premiumMultiplier,
        sharesPercent,
        setSharesPercent,
        extraExponent,
        setExtraExponent,
        autoExtraExponent,
        totalExtraExponent,
        seLevel,
        setSeLevel,
        playerLevel,
        setPlayerLevel,
        dcmLevel,
        setDcmLevel,
        researchLevel,
        setResearchLevel,
        meltdownBundle,
        setMeltdownBundle,
        quantumAddon0,
        setQuantumAddon0,
        totalTechLevels,
        totalExponent,
        exponentGainEntries,
        bestTech,
        topFive,
        techCardRows,
        buyNextBest,
        buyNextForTech,
        setTechLevel,
        autoBuyUnderHour,
        autoBuyUnderDay,
        clearTechLevels,
      }}
    >
      {props.children}
    </OgTechContext.Provider>
  )
}

export const useOgTechContext = (): OgTechContextValue => {
  const context = useContext(OgTechContext)
  if (!context) {
    throw new Error("useOgTechContext must be used inside OgTechProvider")
  }
  return context
}
