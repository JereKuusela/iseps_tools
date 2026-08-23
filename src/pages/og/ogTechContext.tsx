import { createContext, createMemo, type ParentProps, useContext } from "solid-js"
import { LargeNumber } from "../../lib/largeNumber"
import { formatPercentFromRatio } from "../../lib/numberFormat"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { getTokenKey } from "../../lib/tokenSharedInputs"
import { useZatData, type JunoExponentType } from "../../lib/zatContext"
import {
  calculateZatCostForCycle,
  calculateNextZatCost,
  calculateTechValues,
  calculateExponentIncreaseMultipliers,
  calculateNextThreeTechCosts,
  calculateTotalPremiumMultiplier,
  type ZatMode,
} from "../../lib/zatCalculator"
import type { ExponentGainEntry, GainUnit, TechCardRow, TopTechEntry } from "./ogTypes"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const toRatePerSecond = (value: LargeNumber, unit: GainUnit) => {
  if (unit === "min") return value.divide(60)
  if (unit === "hour") return value.divide(3600)
  return value
}

const parseLargeNumberSafe = (value: string): LargeNumber => {
  try {
    return LargeNumber.parse(value.trim() === "" ? "0" : value)
  } catch {
    return LargeNumber.zero()
  }
}

const formatDuration = (hours: number) => {
  if (Number.isNaN(hours) || hours < 0) return "Unknown"
  if (!Number.isFinite(hours)) return "> 10 years"
  if (hours < 1 / 60) return "< 1 min"

  const minutes = hours * 60
  if (minutes < 120) return `${minutes.toFixed(1)} min`

  if (hours < 72) return `${hours.toFixed(1)} hr`

  const days = hours / 24
  if (days < 3650) return `${days.toFixed(1)} days`

  return "> 10 years"
}

const estimateSeconds = (cost: LargeNumber, current: LargeNumber, gainPerSecond: LargeNumber) => {
  if (gainPerSecond.compare(0) <= 0) return Number.POSITIVE_INFINITY
  if (cost.compare(current) <= 0) return 0

  const remaining = cost.subtract(current).divide(gainPerSecond)
  if (remaining.exponent > 12) return Number.POSITIVE_INFINITY
  return remaining.mantissa * 10 ** remaining.exponent
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
  statusAmount: () => string
  setStatusAmount: (next: string) => string
  statusAutoIncrement: () => boolean
  setStatusAutoIncrement: (checked: boolean) => boolean
  goalCycle: () => number
  goalCost: () => string
  goalProgress: () => string
  etaLabel: () => string
  etaMinutes: () => number
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
  topSix: () => TopTechEntry[]
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

  const [cycles, setCycles] = createSyncedSignal("zat.og.cycles", "0")
  const [gainValue, setGainValue] = createSyncedSignal("zat.og.gain", "1.00e1")
  const [gainUnit, setGainUnit] = createSyncedSignal<GainUnit>("zat.og.gainUnit", "hour")
  const [junoAmount, setJunoAmount] = createSyncedSignal("zat.og.junoAmount", "")
  const [statusAmount, setStatusAmount] = createSyncedSignal("penrose.statusAmount", "0")
  const [statusAutoIncrement, setStatusAutoIncrement] = createSyncedSignal("zat.og.statusAutoIncrement", true)
  const [mode, setMode] = createSyncedSignal<ZatMode>("zat.og.mode", "juno")

  const [junoOutput, setJunoOutput] = createSyncedSignal("zat.og.junoOutput", "0")
  const [junoBundle, setJunoBundle] = createSyncedSignal("zat.og.bundle.juno", false)
  const [ixionJunoBundle, setIxionJunoBundle] = createSyncedSignal("zat.og.bundle.ixion", false)
  const [junoKappaBundle, setJunoKappaBundle] = createSyncedSignal("zat.og.bundle.kappa", false)
  const [tokens, setTokens] = createSyncedSignal(getTokenKey("output.juno"), "0")

  const [sharesPercent, setSharesPercent] = createSyncedSignal("zat.guide.shares", "0")

  const [extraExponent, setExtraExponent] = createSyncedSignal("zat.og.extraExponent", "0.001")
  const [seLevel, setSeLevel] = createSyncedSignal("zat.og.seLevel", "0")
  const [playerLevel, setPlayerLevel] = createSyncedSignal("zat.og.playerLevel", "0")
  const [dcmLevel, setDcmLevel] = createSyncedSignal("zat.og.dcmLevel", "0")
  const [researchLevel, setResearchLevel] = createSyncedSignal("zat.og.researchLevel", "0")
  const [meltdownBundle, setMeltdownBundle] = createSyncedSignal("zat.og.meltdown", false)
  const [quantumAddon0, setQuantumAddon0] = createSyncedSignal("zat.og.qa0", false)

  const [techLevels, setTechLevels] = createSyncedSignal<number[]>(
    "zat.og.techLevels",
    Array.from({ length: data().techs.length }, () => 0),
  )

  const gainPerSecond = createMemo(() => {
    const parsed = parseLargeNumberSafe(gainValue())
    if (parsed.compare(0) <= 0) return LargeNumber.zero()
    return toRatePerSecond(parsed, gainUnit())
  })

  const currentJuno = createMemo(() => parseLargeNumberSafe(junoAmount()))
  const normalizedStatusAmount = createMemo(() => parseLargeNumberSafe(statusAmount()))

  const cycleInputFloor = createMemo(() => Math.max(0, Math.floor(parseNumberish(cycles()))))
  const cycleFloorCost = createMemo(() => {
    const floorCycle = Math.max(1, cycleInputFloor())
    return calculateZatCostForCycle(floorCycle)
  })

  const nextCycleInputAmount = createMemo(() => {
    const status = normalizedStatusAmount()
    const gain = gainPerSecond()
    const baseAmount = status.compare(gain) >= 0 ? status : gain
    const floorAmount = cycleFloorCost()
    return baseAmount.compare(floorAmount) >= 0 ? baseAmount : floorAmount
  })

  const nextCycleInfo = createMemo(() => calculateNextZatCost(nextCycleInputAmount()))
  const goalCycle = createMemo(() => Math.max(1, Math.floor(nextCycleInfo().cycle)))
  const goalCostValue = createMemo(() => nextCycleInfo().cost)

  const junoRemainingToGoal = createMemo(() => {
    const targetCost = goalCostValue()
    const current = normalizedStatusAmount()
    if (targetCost.compare(current) <= 0) return LargeNumber.zero()
    return targetCost.subtract(current)
  })

  const goalCost = createMemo(() => goalCostValue().toString(2))

  const etaHours = createMemo(() => {
    const rate = gainPerSecond()
    if (rate.compare(0) <= 0) return Number.POSITIVE_INFINITY

    const remaining = junoRemainingToGoal().divide(rate)
    if (remaining.exponent > 12) return Number.POSITIVE_INFINITY
    const seconds = remaining.mantissa * 10 ** remaining.exponent
    return seconds / 3600
  })

  const goalProgress = createMemo(() => {
    const current = normalizedStatusAmount()
    const target = goalCostValue()
    if (target.compare(0) <= 0) return "100%"
    if (current.compare(target) >= 0) return "100%"
    const ratio = current.divide(target)
    const asNumber = ratio.mantissa * 10 ** ratio.exponent
    return formatPercentFromRatio(asNumber, 0)
  })

  const etaLabel = createMemo(() => formatDuration(etaHours()))
  const etaMinutes = createMemo(() => etaHours() * 60)

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
      qa: quantumAddon0() ? 1 : -1,
      crystal: meltdownBundle() ? 1 : -1,
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
    return 0.01 + totalExtraExponent() + og0Level() * 0.01
  })

  const totalTechLevels = createMemo(() => techLevels().reduce((sum, value) => sum + value, 0))

  const og0ExponentDeltaMultiplier = createMemo(() => {
    const [entry] = calculateExponentIncreaseMultipliers(
      gainPerSecond(),
      Math.max(totalExponent(), 0.001),
      premiumMultiplier(),
      [0.01],
    )

    return entry?.multiplier ?? 1
  })

  const techValues = createMemo(() =>
    calculateTechValues({
      cycles: parseNumberish(cycles()),
      mode: mode(),
      junoExponent: totalExponent(),
      seAmount: parseNumberish(seLevel()),
      currentJuno: currentJuno(),
      gainPerSecond: gainPerSecond(),
      techLevels: techLevels(),
      exponentDeltaMultiplier: og0ExponentDeltaMultiplier(),
    }),
  )

  const exponentGainEntries = createMemo(() => {
    return calculateExponentIncreaseMultipliers(
      gainPerSecond(),
      Math.max(totalExponent(), 0.001),
      premiumMultiplier(),
      [0.01, 0.005, 0.001],
    )
  })

  const rankedRows = createMemo(() => {
    return techValues()
      .rows.filter((row) => row.nextLevel !== null && Number.isFinite(row.score))
      .slice()
      .sort((a, b) => b.score - a.score)
  })

  const bestTech = createMemo<BestTech>(() => {
    const best = rankedRows()[0]
    if (!best || best.nextLevel === null) return null
    return {
      id: best.id,
      level: best.nextLevel,
      etaSeconds: best.etaSeconds,
    }
  })

  const topSix = createMemo<TopTechEntry[]>(() => {
    const all = rankedRows()
    if (all.length === 0) return []

    return all.slice(0, 6).map((row) => ({
      id: row.id,
      level: row.nextLevel ?? row.currentLevel,
      score: row.score,
      relative: row.relative,
      etaSeconds: row.etaSeconds,
    }))
  })

  const techCardRows = createMemo<TechCardRow[]>(() => {
    const snapshot = techValues()
    const rowsById = new Map(snapshot.rows.map((row) => [row.id, row]))

    return data().techs.map((tech) => {
      const row = rowsById.get(tech.id)

      return {
        id: tech.id,
        label: `OG${tech.id}`,
        maxLevel: tech.maxLevel,
        level: row?.currentLevel ?? 0,
        nextLevel: row?.nextLevel ?? null,
        relative: row?.relative ?? 0,
        etaSeconds: row?.etaSeconds ?? Number.POSITIVE_INFINITY,
        nextCost: row?.nextCost ? row.nextCost.toString(2) : "-",
        tooltip: tech.tooltip,
      }
    })
  })

  const setTechLevel = (id: number, next: number) => {
    setTechLevels((current) => {
      const updated = current.slice()
      const maxLevel = data().techs[id]?.maxLevel ?? Number.POSITIVE_INFINITY
      updated[id] = Math.min(maxLevel, Math.max(0, Math.floor(next)))
      return updated
    })
  }

  const incrementStatusByCost = (cost: LargeNumber) => {
    if (!statusAutoIncrement()) return
    const current = parseLargeNumberSafe(statusAmount())
    setStatusAmount(current.add(cost).toString(2))
  }

  const buyNextForTech = (id: number) => {
    const currentLevel = techLevels()[id] ?? 0
    const next = calculateNextThreeTechCosts(id, currentLevel)[0]
    if (!next) return
    incrementStatusByCost(next.cost)
    setTechLevel(id, next.level)
  }

  const buyNextBest = () => {
    const best = bestTech()
    if (!best) return
    const currentLevel = techLevels()[best.id] ?? 0
    const next = calculateNextThreeTechCosts(best.id, currentLevel)[0]
    if (next) incrementStatusByCost(next.cost)
    setTechLevel(best.id, best.level)
  }

  const autoBuyUnderLimit = (limit: number) => {
    const techList = data().techs
    const updatedLevels = techLevels().map((level, id) => {
      const maxLevel = techList[id]?.maxLevel ?? Number.POSITIVE_INFINITY
      return Math.min(maxLevel, Math.max(0, Math.floor(level)))
    })
    const current = currentJuno()
    const gain = gainPerSecond()

    if (gain.compare(0) <= 0) return

    let foundInPass = false
    let iterations = 0
    const maxIterations = 10_000

    do {
      foundInPass = false

      for (const tech of techList) {
        const maxLevel = tech.maxLevel
        const currentLevel = updatedLevels[tech.id] ?? 0
        if (currentLevel >= maxLevel) continue

        const next = calculateNextThreeTechCosts(tech.id, currentLevel)[0]
        if (!next) continue

        const etaSeconds = estimateSeconds(next.cost, current, gain)
        if (etaSeconds <= limit) {
          const nextLevel = Math.min(maxLevel, next.level)
          if (nextLevel <= currentLevel) continue

          updatedLevels[tech.id] = nextLevel
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
        statusAmount,
        setStatusAmount,
        statusAutoIncrement,
        setStatusAutoIncrement,
        mode,
        setMode,
        goalCycle,
        goalCost,
        goalProgress,
        etaLabel,
        etaMinutes,
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
        topSix,
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
