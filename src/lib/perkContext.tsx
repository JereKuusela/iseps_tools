import { createContext, type Accessor, type ParentProps, useContext } from "solid-js"
import perkGuideRowsJson from "../../data/perk_guide_rows.json"
import perksMetaJson from "../../data/perks_meta.json"

export type PerkRunType = "se_push" | (string & {})

export type PerkRunOption = {
  value: PerkRunType
  label: string
}

export type PerkRowId = "W" | "R" | "B" | "Y" | "L" | "P" | "O" | "G" | "Bu" | "T"

export type PerkRowMeta = {
  id: PerkRowId
  label: string
  color: string
}

export type PerkMetaPerk = {
  id: string
  rowId: PerkRowId
  tier: number
  label: string
  tooltip: string
}

export type PerkExtraKey = "IP" | "M1" | "M2" | "M3"

export type PerkExtrasTooltips = Partial<Record<PerkRowId, Partial<Record<PerkExtraKey, string>>>>

export type PerkMeta = {
  runTypes: PerkRunOption[]
  rowOrder: PerkRowId[]
  rows: PerkRowMeta[]
  columns: {
    levels: number[]
    extras: PerkExtraKey[]
  }
  perks: PerkMetaPerk[]
  extrasTooltips?: PerkExtrasTooltips
}

export type PerkIpmEntry = {
  ip: number
  m1: number
  m2: number
  m3: number
}

export type PerkGuideEntry = {
  se: number
  run: PerkRunType
  perks: string[]
  perkLevels: Record<string, number>
  ipm: Partial<Record<PerkRowId, PerkIpmEntry>>
  changes: string
  notes: string
  path: string
}

export type PerkDataBundle = {
  meta: PerkMeta
  rows: PerkGuideEntry[]
}

const normalizeRun = (value: string): PerkRunType => {
  const normalized = value.trim().toLowerCase()
  if (normalized.length === 0) return "se_push"
  return normalized as PerkRunType
}

const toInt = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

const asText = (value: unknown) => String(value ?? "").trim()

const asRowId = (value: unknown): PerkRowId | null => {
  const text = asText(value)
  if (text === "W" || text === "R" || text === "B" || text === "Y" || text === "L") return text
  if (text === "P" || text === "O" || text === "G" || text === "Bu" || text === "T") return text
  return null
}

const rawMeta = perksMetaJson as PerkMeta

const normalizedMeta: PerkMeta = {
  runTypes: rawMeta.runTypes.map((option) => ({
    value: normalizeRun(option.value),
    label: asText(option.label) || asText(option.value),
  })),
  rowOrder: rawMeta.rowOrder.map(asRowId).filter((entry): entry is PerkRowId => entry != null),
  rows: rawMeta.rows
    .map((row) => {
      const id = asRowId(row.id)
      if (!id) return null
      return {
        id,
        label: asText(row.label) || id,
        color: asText(row.color) || "#94A3B8",
      }
    })
    .filter((entry): entry is PerkRowMeta => entry != null),
  columns: {
    levels: rawMeta.columns.levels.map((value) => toInt(value)).filter((value) => value > 0),
    extras: rawMeta.columns.extras
      .map(asText)
      .filter((value): value is PerkExtraKey => value === "IP" || value === "M1" || value === "M2" || value === "M3"),
  },
  perks: rawMeta.perks
    .map((perk) => {
      const rowId = asRowId(perk.rowId)
      if (!rowId) return null
      return {
        id: asText(perk.id),
        rowId,
        tier: toInt(perk.tier),
        label: asText(perk.label) || asText(perk.id),
        tooltip: asText(perk.tooltip),
      }
    })
    .filter((entry): entry is PerkMetaPerk => entry != null),
  extrasTooltips: (() => {
    const raw = rawMeta.extrasTooltips ?? {}
    const normalized: PerkExtrasTooltips = {}

    for (const [rowId, rowTooltips] of Object.entries(raw)) {
      const normalizedRowId = asRowId(rowId)
      if (!normalizedRowId) continue

      const tooltipEntries = (rowTooltips ?? {}) as Record<string, unknown>
      const parsed: Partial<Record<PerkExtraKey, string>> = {}

      for (const [extraKey, tooltip] of Object.entries(tooltipEntries)) {
        if (extraKey !== "IP" && extraKey !== "M1" && extraKey !== "M2" && extraKey !== "M3") continue

        const text = asText(tooltip)
        if (text.length === 0) continue

        parsed[extraKey] = text
      }

      normalized[normalizedRowId] = parsed
    }

    return normalized
  })(),
}

const normalizedRows = (perkGuideRowsJson as unknown[])
  .map((rawEntry) => {
    const entry = (rawEntry ?? {}) as Partial<PerkGuideEntry>
    const perkLevels: Record<string, number> = {}
    for (const [perkId, level] of Object.entries(entry.perkLevels ?? {})) {
      const normalizedPerkId = asText(perkId)
      const normalizedLevel = toInt(level)
      if (normalizedPerkId.length === 0 || normalizedLevel <= 0) continue
      perkLevels[normalizedPerkId] = normalizedLevel
    }

    const perks = Object.keys(perkLevels)

    const ipm: Partial<Record<PerkRowId, PerkIpmEntry>> = {}
    for (const [rowId, rawIpm] of Object.entries(entry.ipm ?? {})) {
      const normalizedRowId = asRowId(rowId)
      if (!normalizedRowId || !rawIpm) continue

      const ipmRaw = rawIpm as Partial<PerkIpmEntry>

      const ipmEntry: PerkIpmEntry = {
        ip: toInt(ipmRaw.ip),
        m1: toInt(ipmRaw.m1),
        m2: toInt(ipmRaw.m2),
        m3: toInt(ipmRaw.m3),
      }

      if (ipmEntry.ip === 0 && ipmEntry.m1 === 0 && ipmEntry.m2 === 0 && ipmEntry.m3 === 0) continue
      ipm[normalizedRowId] = ipmEntry
    }

    return {
      se: toInt(entry.se),
      run: normalizeRun(String(entry.run ?? "se_push")),
      perks,
      perkLevels,
      ipm,
      changes: asText(entry.changes),
      notes: asText(entry.notes),
      path: asText(entry.path),
    }
  })
  .filter((entry) => entry.se > 0)
  .sort((a, b) => a.se - b.se)

const perkDataBundle: PerkDataBundle = {
  meta: normalizedMeta,
  rows: normalizedRows,
}

const PerkDataContext = createContext<Accessor<PerkDataBundle>>()

export const PerkDataProvider = (props: ParentProps) => {
  const accessor = () => perkDataBundle
  return <PerkDataContext.Provider value={accessor}>{props.children}</PerkDataContext.Provider>
}

export const usePerkData = (): Accessor<PerkDataBundle> => {
  const context = useContext(PerkDataContext)
  if (!context) {
    throw new Error("usePerkData must be used inside PerkDataProvider")
  }
  return context
}
