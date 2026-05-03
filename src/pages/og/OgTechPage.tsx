import { createMemo, createSignal } from "solid-js"
import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { LargeNumber } from "../../lib/largeNumber"
import { createPersistedSignal } from "../../lib/persistedSignal"
import { formatTimeDurationFromSeconds } from "../../lib/timeFormat"
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
import { OgTechLeftColumn } from "./OgTechLeftColumn"
import { OgTechRightColumn } from "./OgTechRightColumn"
import type { ExponentGainEntry, GainUnit, RankedTech, TechCardRow, TopTechEntry } from "./ogTypes"

const gainUnits: Array<{ value: GainUnit; label: string }> = [
  { value: "sec", label: "Per second" },
  { value: "min", label: "Per minute" },
  { value: "hour", label: "Per hour" },
]

const modeOptions: Array<{ value: ZatMode; label: string }> = [
  { value: "juno", label: "Juno" },
  { value: "dc", label: "DC" },
]

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(2)}%`
}

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

const secondsToLabel = (seconds: number) => formatTimeDurationFromSeconds(seconds)

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

export const OgTechPage = (props: { cycles: string; setCycles: (next: string) => void }) => {
  const data = useZatData()

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
  const [showExpandedExponent, setShowExpandedExponent] = createSignal(false)
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

  const shareAmount = createMemo(() => Math.max(0, parseNumberish(sharesPercent()) / 0.05))

  const currentJuno = createMemo(() => parseLargeNumberSafe(junoAmount()))
  const seEffect = createMemo(() => calculateSeEffect(parseNumberish(seLevel())))
  const zatBoost = createMemo(() => calculateZatBoostPerTech(parseNumberish(props.cycles), mode()))

  const premiumSummary = createMemo(() => {
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

  const selectedExtraExponent = createMemo(() => {
    if (showExpandedExponent()) return autoExtraExponent()
    return Math.max(0, parseNumberish(extraExponent()))
  })

  const og0Level = createMemo(() => techLevels()[0] ?? 0)
  const totalExponent = createMemo(() => {
    const meltdown = meltdownBundle() ? 0.005 : 0
    return 0.01 + selectedExtraExponent() + og0Level() * 0.01 + meltdown
  })

  const exponentGainEntries = createMemo(() => {
    return calculateExponentIncreaseMultipliers(
      gainPerSecond(),
      Math.max(totalExponent(), 0.001),
      premiumSummary().multiplier,
      [0.001, 0.005, 0.01],
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

  const bestTech = createMemo(() => rankedTechs()[0] ?? null)

  const topFive = createMemo<TopTechEntry[]>(() => {
    const all = rankedTechs()
    if (all.length === 0) return []
    const best = all[0].score

    return all.slice(0, 5).map((entry) => ({
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
      updated[id] = Math.max(0, Math.floor(next))
      return updated
    })
  }

  const buyTechLevel = (id: number) => {
    setTechLevel(id, (techLevels()[id] ?? 0) + 1)
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
          updatedLevels[tech.id] = next.level + 1
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

  const exponentEntries = createMemo<ExponentGainEntry[]>(() => {
    return exponentGainEntries().map((entry) => ({
      delta: entry.delta,
      multiplier: entry.multiplier,
    }))
  })

  return (
    <Panel title="OG Tech" tooltip="og.panel">
      <SplitColumns
        layoutClass="xl:grid-cols-[1.05fr_1.25fr]"
        right={
          <OgTechRightColumn
            totalTechLevels={totalTechLevels()}
            bestTech={bestTech()}
            seEffect={seEffect()}
            topFive={topFive()}
            techCardRows={techCardRows()}
            onAutoBuyUnderHour={autoBuyUnderHour}
            onAutoBuyUnderDay={autoBuyUnderDay}
            onClearTechLevels={clearTechLevels}
            onBuyNextBest={buyNextBest}
            onSetTechLevel={setTechLevel}
            onBuyTechLevel={buyTechLevel}
            secondsToLabel={secondsToLabel}
            formatPercent={formatPercent}
            parseNumberish={parseNumberish}
          />
        }
      >
        <OgTechLeftColumn
          cycles={props.cycles}
          setCycles={props.setCycles}
          gainValue={gainValue()}
          setGainValue={setGainValue}
          gainUnit={gainUnit()}
          setGainUnit={setGainUnit}
          gainUnits={gainUnits}
          junoAmount={junoAmount()}
          setJunoAmount={setJunoAmount}
          mode={mode()}
          setMode={setMode}
          modeOptions={modeOptions}
          junoOutput={junoOutput()}
          setJunoOutput={setJunoOutput}
          junoBundle={junoBundle()}
          setJunoBundle={setJunoBundle}
          ixionJunoBundle={ixionJunoBundle()}
          setIxionJunoBundle={setIxionJunoBundle}
          junoKappaBundle={junoKappaBundle()}
          setJunoKappaBundle={setJunoKappaBundle}
          tokens={tokens()}
          setTokens={setTokens}
          premiumMultiplier={premiumSummary().multiplier}
          sharesPercent={sharesPercent()}
          setSharesPercent={setSharesPercent}
          shareAmount={shareAmount()}
          extraExponent={extraExponent()}
          setExtraExponent={setExtraExponent}
          showExpandedExponent={showExpandedExponent()}
          onToggleExpandedExponent={() => setShowExpandedExponent((current) => !current)}
          seLevel={seLevel()}
          setSeLevel={setSeLevel}
          playerLevel={playerLevel()}
          setPlayerLevel={setPlayerLevel}
          dcmLevel={dcmLevel()}
          setDcmLevel={setDcmLevel}
          researchLevel={researchLevel()}
          setResearchLevel={setResearchLevel}
          meltdownBundle={meltdownBundle()}
          setMeltdownBundle={setMeltdownBundle}
          quantumAddon0={quantumAddon0()}
          setQuantumAddon0={setQuantumAddon0}
          totalExponent={totalExponent()}
          exponentGainEntries={exponentEntries()}
        />
      </SplitColumns>
    </Panel>
  )
}
