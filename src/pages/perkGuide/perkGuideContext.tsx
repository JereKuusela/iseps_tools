import { createContext, createEffect, createMemo, type ParentProps, useContext } from "solid-js"
import { createSyncedSignal } from "../../lib/persistedSignal"
import {
  type PerkGuideEntry,
  type PerkMetaPerk,
  type PerkRowId,
  type PerkRunType,
  usePerkData,
} from "../../lib/perkContext"
import type { PerkGuideRowView, PerkRowLookup, PerkRunOption } from "./perkGuideTypes"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

type PerkGuideContextValue = {
  se: () => string
  setSe: (next: string) => string
  runType: () => PerkRunType
  setRunType: (next: PerkRunType) => PerkRunType
  runOptions: () => PerkRunOption[]
  guideOptions: () => { value: string; label: string }[]
  selectedGuideKey: () => string
  setSelectedGuideKey: (next: string) => string
  selectedEntry: () => PerkGuideEntry | undefined
  previousEntry: () => PerkGuideEntry | undefined
  selectedChangesText: () => string[]
  rowViews: () => PerkGuideRowView[]
  rowOrder: () => PerkRowId[]
  hasDataForCurrentSelection: () => boolean
}

const PerkGuideContext = createContext<PerkGuideContextValue>()

const buildGuideKey = (entry: PerkGuideEntry) => `${entry.run}|${entry.se}|${entry.perks.join(",")}`

const formatPerkList = (perkIds: string[]) => perkIds.join(", ")

const pushDeltaToken = (
  taken: string[],
  dropped: string[],
  rowId: PerkRowId,
  key: "IP",
  previous: number,
  current: number,
) => {
  const delta = current - previous
  if (delta === 0) return

  const amount = Math.abs(delta)
  const token = amount > 1 ? `${amount} ${rowId}${key}` : `${rowId}${key}`

  if (delta > 0) {
    taken.push(token)
    return
  }

  dropped.push(token)
}

const derivePerkChangesText = (entry: PerkGuideEntry, previousEntry?: PerkGuideEntry) => {
  if (!previousEntry) {
    if (entry.perks.length === 0) return ["- No perk delta for this SE."]
    return [`- Add ${formatPerkList(entry.perks)}`]
  }

  const previousPerks = new Set(previousEntry.perks)
  const currentPerks = new Set(entry.perks)

  const added = entry.perks.filter((perkId) => !previousPerks.has(perkId))
  const removed = previousEntry.perks.filter((perkId) => !currentPerks.has(perkId))

  const taken: string[] = [...added]
  const dropped: string[] = [...removed]

  const lines: string[] = []

  const ipmRowIds = new Set<PerkRowId>([
    ...Object.keys(previousEntry.ipByRow ?? {}),
    ...Object.keys(entry.ipByRow ?? {}),
  ] as PerkRowId[])

  for (const rowId of ipmRowIds) {
    const previousIp = previousEntry.ipByRow[rowId] ?? 0
    const currentIp = entry.ipByRow[rowId] ?? 0

    pushDeltaToken(taken, dropped, rowId, "IP", previousIp, currentIp)
  }

  if (dropped.length > 0) lines.push(`- Remove ${formatPerkList(dropped)}`)
  if (taken.length > 0) lines.push(`- Add ${formatPerkList(taken)}`)

  if (lines.length === 0) return ["- No perk delta for this SE."]
  return lines
}

const deriveGuideLabel = (entry: PerkGuideEntry, index: number) => {
  if (entry.perks.length === 0) return `Guide ${index + 1}`
  const preview = entry.perks.slice(0, 4)
  const suffix = entry.perks.length > 4 ? ` +${entry.perks.length - 4}` : ""
  return `${formatPerkList(preview)}${suffix}`
}

export const PerkGuideProvider = (props: ParentProps) => {
  const data = usePerkData()

  const [se, setSe] = createSyncedSignal("perk.guide.se", "1")
  const [runType, setRunType] = createSyncedSignal<PerkRunType>("perk.guide.runType", "se_push")
  const [selectedGuideKey, setSelectedGuideKey] = createSyncedSignal("perk.guide.key", "")

  const normalizedSe = createMemo(() => {
    const parsed = Math.floor(parseNumberish(se()))
    if (!Number.isFinite(parsed)) return 1
    return Math.max(1, parsed)
  })

  const runOptions = createMemo<PerkRunOption[]>(() => data().meta.runTypes)

  const availableGuides = createMemo(() => {
    const currentSe = normalizedSe()
    const currentRun = runType()
    return data().rows.filter((entry) => entry.se === currentSe && entry.run === currentRun)
  })

  const selectedEntry = createMemo(() => {
    const selectedKey = selectedGuideKey()
    const guides = availableGuides()
    return guides.find((entry) => buildGuideKey(entry) === selectedKey) ?? guides[0]
  })

  const guideOptions = createMemo(() => {
    return availableGuides().map((entry, index) => ({
      value: buildGuideKey(entry),
      label: deriveGuideLabel(entry, index),
    }))
  })

  createEffect(() => {
    const selected = selectedEntry()
    if (!selected) return

    const key = buildGuideKey(selected)
    if (selectedGuideKey() !== key) {
      setSelectedGuideKey(key)
    }
  })

  const rowLookup = createMemo<PerkRowLookup>(() => {
    const lookup: PerkRowLookup = new Map()
    for (const perk of data().meta.perks) {
      const current = lookup.get(perk.rowId)
      if (!current) {
        lookup.set(perk.rowId, [perk])
        continue
      }
      current.push(perk)
    }

    for (const perks of lookup.values()) {
      perks.sort((a, b) => a.tier - b.tier)
    }

    return lookup
  })

  const rowMetaMap = createMemo(() => new Map(data().meta.rows.map((row) => [row.id, row])))

  const rowViews = createMemo<PerkGuideRowView[]>(() => {
    const entry = selectedEntry()
    const selectedPerks = new Set(entry?.perks ?? [])

    return data().meta.rowOrder.map((rowId) => {
      const row = rowMetaMap().get(rowId) ?? {
        id: rowId,
        label: rowId,
        color: "#94A3B8",
      }

      const rowPerks = rowLookup().get(rowId) ?? []
      const activePerks = rowPerks.filter((perk) => selectedPerks.has(perk.id))

      return {
        row,
        activePerks,
        ip: entry?.ipByRow[rowId] ?? 0,
        milestones: {
          m1: selectedPerks.has(`${rowId}M1`),
          m2: selectedPerks.has(`${rowId}M2`),
          m3: selectedPerks.has(`${rowId}M3`),
        },
      }
    })
  })

  const previousEntry = createMemo<PerkGuideEntry | undefined>(() => {
    const current = selectedEntry()
    if (!current) return undefined

    const candidates = data()
      .rows.filter((entry) => entry.run === current.run && entry.se < current.se)
      .sort((a, b) => b.se - a.se)

    return candidates[0]
  })

  const selectedChangesText = createMemo(() => {
    const selected = selectedEntry()
    if (!selected) return []
    return derivePerkChangesText(selected, previousEntry())
  })

  return (
    <PerkGuideContext.Provider
      value={{
        se,
        setSe,
        runType,
        setRunType,
        runOptions,
        guideOptions,
        selectedGuideKey,
        setSelectedGuideKey,
        selectedEntry,
        previousEntry,
        selectedChangesText,
        rowViews,
        rowOrder: () => data().meta.rowOrder,
        hasDataForCurrentSelection: () => availableGuides().length > 0,
      }}
    >
      {props.children}
    </PerkGuideContext.Provider>
  )
}

export const usePerkGuideContext = (): PerkGuideContextValue => {
  const context = useContext(PerkGuideContext)
  if (!context) {
    throw new Error("usePerkGuideContext must be used inside PerkGuideProvider")
  }
  return context
}
