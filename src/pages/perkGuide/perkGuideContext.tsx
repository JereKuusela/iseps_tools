import { createContext, createEffect, createMemo, type ParentProps, useContext } from "solid-js"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { type PerkGuideEntry, type PerkRowId, type PerkRunType, usePerkData } from "../../lib/perkContext"
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
  requestedSe: () => number
  selectedEntry: () => PerkGuideEntry | undefined
  previousEntry: () => PerkGuideEntry | undefined
  selectedChangesText: () => string[]
  rowViews: () => PerkGuideRowView[]
  rowOrder: () => PerkRowId[]
  hasDataForCurrentSelection: () => boolean
}

const PerkGuideContext = createContext<PerkGuideContextValue>()

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

export const PerkGuideProvider = (props: ParentProps) => {
  const data = usePerkData()

  const [se, setSe] = createSyncedSignal("perk.guide.se", "1")
  const [runType, setRunType] = createSyncedSignal<PerkRunType>("perk.guide.runType", "se")

  const normalizedSe = createMemo(() => {
    const parsed = Math.floor(parseNumberish(se()))
    if (!Number.isFinite(parsed)) return 1
    return Math.max(1, parsed)
  })

  const runOptions = createMemo<PerkRunOption[]>(() => data().definitions.runTypes)

  const availableGuides = createMemo(() => {
    const currentSe = normalizedSe()
    const currentRun = runType()
    return data().perks.filter((entry) => entry.se === currentSe && entry.run === currentRun)
  })

  const runGuides = createMemo(() => {
    const currentRun = runType()
    return data()
      .perks.filter((entry) => entry.run === currentRun)
      .sort((a, b) => a.se - b.se)
  })

  const selectedEntry = createMemo(() => {
    const exactMatch = availableGuides()[0]
    if (exactMatch) return exactMatch
    return runGuides()[0]
  })

  const rowLookup = createMemo<PerkRowLookup>(() => {
    const lookup: PerkRowLookup = new Map()
    for (const perk of data().definitions.perks) {
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

  const rowMetaMap = createMemo(() => new Map(data().definitions.rows.map((row) => [row.id, row])))

  const rowViews = createMemo<PerkGuideRowView[]>(() => {
    const entry = selectedEntry()
    const selectedPerks = new Set(entry?.perks ?? [])

    return data().definitions.rowOrder.map((rowId) => {
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
      .perks.filter((entry) => entry.run === current.run && entry.se < current.se)
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
        requestedSe: normalizedSe,
        selectedEntry,
        previousEntry,
        selectedChangesText,
        rowViews,
        rowOrder: () => data().definitions.rowOrder,
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
