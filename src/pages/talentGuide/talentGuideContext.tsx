import { createContext, createMemo, type ParentProps, useContext } from "solid-js"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { parseNumberish } from "../../lib/parseNumber"
import { perkDataBundle } from "../../shared/perkContext"
import { computeTalentAllocation, type TalentAllocation, type TalentRunType } from "./talentCalculator"
import { SHARED_SE_KEY } from "../../shared/tokenSharedInputs"
import { talentDefs } from "./talentData"

const runOptions: { value: TalentRunType; label: string }[] = [
  { value: "se", label: "SE Push" },
  { value: "grun", label: "G-Points" },
  { value: "jrun", label: "Juno" },
]

type TalentGuideContextValue = {
  runType: () => TalentRunType
  setRunType: (next: TalentRunType) => TalentRunType
  runOptions: () => { value: TalentRunType; label: string }[]
  se: () => string
  setSe: (next: string) => string
  lp: () => string
  setLp: (next: string) => string
  gCorpMaxed: () => boolean
  setGCorpMaxed: (next: boolean) => boolean
  allocation: () => TalentAllocation
  previousLp: () => number | undefined
  changes: () => string[]
  changeNotes: () => string[]
}

const TalentGuideContext = createContext<TalentGuideContextValue>()

const sePerks = perkDataBundle.perks.filter((entry) => entry.run === "se").sort((a, b) => a.se - b.se)

const perksByRun = (run: TalentRunType) => {
  const entries = perkDataBundle.perks.filter((entry) => entry.run === run).sort((a, b) => a.se - b.se)
  return entries.length > 0 ? entries : sePerks
}

// Past the last perk guide row, the last known perk set stays recommended.
const perksForSe = (run: TalentRunType, se: number) => {
  const entries = perksByRun(run)
  let match = entries[0]
  for (const entry of entries) {
    if (entry.se > se) break
    match = entry
  }
  return new Set(match?.perks ?? [])
}

// Talents whose boost only applies to what is earned after buying them.
const NON_RETROACTIVE: Record<string, string> = { "IC1-1": "Artifact", "IC2-1": "Solution", "IC5-2": "Emblem" }

export const TalentGuideProvider = (props: ParentProps) => {
  const [se, setSe] = createSyncedSignal(SHARED_SE_KEY, "1")
  const [runType, setRunType] = createSyncedSignal<TalentRunType>("talent.guide.runType", "se")
  const [lp, setLp] = createSyncedSignal("talent.guide.lp", "100")
  const [gCorpMaxed, setGCorpMaxed] = createSyncedSignal("talent.guide.gCorpMaxed", false)

  const allocation = createMemo(() => {
    const seValue = Math.max(1, Math.floor(parseNumberish(se())) || 1)
    const lpValue = Math.max(0, Math.floor(parseNumberish(lp())) || 0)
    return computeTalentAllocation({
      run: runType(),
      se: seValue,
      lp: lpValue,
      gCorpMaxed: gCorpMaxed(),
      perks: perksForSe(runType(), seValue),
    })
  })

  const previousLp = createMemo(() => {
    const lpValue = Math.max(0, Math.floor(parseNumberish(lp())) || 0)
    return lpValue > 0 ? lpValue - 1 : undefined
  })

  const changeSummary = createMemo(() => {
    const before = previousLp()
    if (before === undefined) return { lines: [] as string[], notes: [] as string[] }
    const seValue = Math.max(1, Math.floor(parseNumberish(se())) || 1)
    const previous = computeTalentAllocation({
      run: runType(),
      se: seValue,
      lp: before,
      gCorpMaxed: gCorpMaxed(),
      perks: perksForSe(runType(), seValue),
    }).levels
    const current = allocation().levels
    const added: string[] = []
    const removed: string[] = []
    const boosted: string[] = []
    for (const def of talentDefs) {
      const delta = (current[def.id] ?? 0) - (previous[def.id] ?? 0)
      if (delta === 0) continue
      const amount = Math.abs(delta)
      const token = amount > 1 ? `${amount} ${def.id}` : def.id
      ;(delta > 0 ? added : removed).push(token)
      if (delta > 0 && NON_RETROACTIVE[def.id]) boosted.push(NON_RETROACTIVE[def.id])
    }
    const lines: string[] = []
    if (removed.length > 0) lines.push(`- Remove ${removed.join(", ")}`)
    if (added.length > 0) lines.push(`- Add ${added.join(", ")}`)
    const notes =
      boosted.length > 0
        ? [`${boosted.join(", ")} boosts are not retroactive.\nSimulation reset is needed for the bonus.`]
        : []
    return { lines, notes }
  })

  return (
    <TalentGuideContext.Provider
      value={{
        runType,
        setRunType,
        runOptions: () => runOptions,
        se,
        setSe,
        lp,
        setLp,
        gCorpMaxed,
        setGCorpMaxed,
        allocation,
        previousLp,
        changes: () => changeSummary().lines,
        changeNotes: () => changeSummary().notes,
      }}
    >
      {props.children}
    </TalentGuideContext.Provider>
  )
}

export const useTalentGuideContext = (): TalentGuideContextValue => {
  const context = useContext(TalentGuideContext)
  if (!context) {
    throw new Error("useTalentGuideContext must be used inside TalentGuideProvider")
  }
  return context
}
