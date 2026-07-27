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

const PERK_EXTRA_KEYS = ["IP", "M1", "M2", "M3"] as const
export type PerkExtraKey = (typeof PERK_EXTRA_KEYS)[number]

export type PerkExtrasTooltips = Partial<Record<PerkRowId, Partial<Record<PerkExtraKey, string>>>>

export type PerkMeta = {
  runTypes: PerkRunOption[]
  rowOrder: PerkRowId[]
  rows: PerkRowMeta[]
  perks: PerkMetaPerk[]
  extrasTooltips?: PerkExtrasTooltips
}

export type PerkIpByRow = Partial<Record<PerkRowId, number>>

export type PerkGuideEntry = {
  se: number
  run: PerkRunType
  perks: string[]
  ipByRow: PerkIpByRow
  notes: string
}

type RawPerkGuideEntry = {
  se: unknown
  run: unknown
  add?: unknown
  remove?: unknown
  notes?: unknown
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

const normalizeRowToken = (value: string) => {
  const upper = value.toUpperCase()
  if (upper === "BU") return "Bu"
  return upper
}

const normalizePerkToken = (value: string) => {
  const trimmed = asText(value)
  if (trimmed.length === 0) return ""

  const milestoneMatch = trimmed.match(/^([A-Za-z]+)M([123])$/)
  if (milestoneMatch) {
    const row = normalizeRowToken(milestoneMatch[1])
    return `${row}M${milestoneMatch[2]}`
  }

  const perkMatch = trimmed.match(/^([A-Za-z]+)(\d+)$/)
  if (perkMatch) {
    const row = normalizeRowToken(perkMatch[1])
    return `${row}${Number(perkMatch[2])}`
  }

  const ipMatch = trimmed.match(/^([A-Za-z]+)IP$/i)
  if (ipMatch) {
    const row = normalizeRowToken(ipMatch[1])
    return `${row}IP`
  }

  return trimmed
}

const asTokenList = (value: unknown) => {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => normalizePerkToken(entry))
      .filter((entry) => entry.length > 0)
  }

  if (!Array.isArray(value)) return []
  return value.map((entry) => normalizePerkToken(asText(entry))).filter((entry) => entry.length > 0)
}

const parseIpTokenDelta = (token: string) => {
  const withAmountMatch = token.match(/^(\d+)\s*([A-Za-z]+)IP$/i)
  if (withAmountMatch) {
    const rowId = asRowId(normalizeRowToken(withAmountMatch[2]))
    if (!rowId) return null
    const amount = Math.max(0, Number(withAmountMatch[1]))
    if (amount === 0) return null
    return { rowId, amount }
  }

  const singleMatch = token.match(/^([A-Za-z]+)IP$/i)
  if (!singleMatch) return null

  const rowId = asRowId(normalizeRowToken(singleMatch[1]))
  if (!rowId) return null
  return { rowId, amount: 1 }
}

const cloneIpByRowState = (ipByRow: PerkIpByRow) => {
  const cloned: PerkIpByRow = {}
  for (const [rowId, entry] of Object.entries(ipByRow)) {
    const normalizedRowId = asRowId(rowId)
    if (!normalizedRowId) continue
    const value = toInt(entry)
    if (value <= 0) continue
    cloned[normalizedRowId] = value
  }
  return cloned
}

const perkTokenSortWeight = (token: string, rowOrder: PerkRowId[]) => {
  const milestoneMatch = token.match(/^([A-Za-z]+)M([123])$/)
  if (milestoneMatch) {
    const rowId = asRowId(milestoneMatch[1])
    const rowRank = rowId ? rowOrder.indexOf(rowId) : Number.MAX_SAFE_INTEGER
    const milestoneTier = Number(milestoneMatch[2])
    return rowRank * 1000 + 700 + milestoneTier
  }

  const perkMatch = token.match(/^([A-Za-z]+)(\d+)$/)
  if (perkMatch) {
    const rowId = asRowId(perkMatch[1])
    const rowRank = rowId ? rowOrder.indexOf(rowId) : Number.MAX_SAFE_INTEGER
    const tier = Number(perkMatch[2])
    return rowRank * 1000 + tier
  }

  return Number.MAX_SAFE_INTEGER
}

const sortPerkTokens = (tokens: string[], rowOrder: PerkRowId[]) => {
  return tokens.slice().sort((a, b) => {
    const weightA = perkTokenSortWeight(a, rowOrder)
    const weightB = perkTokenSortWeight(b, rowOrder)
    if (weightA !== weightB) return weightA - weightB
    return a.localeCompare(b)
  })
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
        if (!PERK_EXTRA_KEYS.includes(extraKey as PerkExtraKey)) continue

        const text = asText(tooltip)
        if (text.length === 0) continue

        parsed[extraKey as PerkExtraKey] = text
      }

      normalized[normalizedRowId] = parsed
    }

    return normalized
  })(),
}

const rawGuideRows = (perkGuideRowsJson as unknown[])
  .map((rawEntry) => {
    const entry = (rawEntry ?? {}) as RawPerkGuideEntry
    return {
      se: toInt(entry.se),
      run: normalizeRun(String(entry.run ?? "se_push")),
      entry,
    }
  })
  .filter((entry) => entry.se > 0)

const rowsByRun = new Map<PerkRunType, { se: number; run: PerkRunType; entry: RawPerkGuideEntry }[]>()
for (const row of rawGuideRows) {
  const current = rowsByRun.get(row.run)
  if (!current) {
    rowsByRun.set(row.run, [row])
    continue
  }
  current.push(row)
}

const normalizedRows: PerkGuideEntry[] = []

for (const [run, rows] of rowsByRun.entries()) {
  rows.sort((a, b) => a.se - b.se)

  let previousPerks = new Set<string>()
  let previousIpByRow: PerkIpByRow = {}

  for (const row of rows) {
    const raw = row.entry

    let nextPerks = new Set(previousPerks)
    let nextIpByRow = cloneIpByRowState(previousIpByRow)

    for (const token of asTokenList(raw.remove)) {
      const ipToken = parseIpTokenDelta(token)
      if (ipToken) {
        const current = toInt(nextIpByRow[ipToken.rowId] ?? 0)
        const nextValue = Math.max(0, current - ipToken.amount)
        if (nextValue <= 0) {
          delete nextIpByRow[ipToken.rowId]
        } else {
          nextIpByRow[ipToken.rowId] = nextValue
        }
        continue
      }

      nextPerks.delete(token)
    }

    for (const token of asTokenList(raw.add)) {
      const ipToken = parseIpTokenDelta(token)
      if (ipToken) {
        const current = toInt(nextIpByRow[ipToken.rowId] ?? 0)
        const nextValue = Math.max(0, current + ipToken.amount)
        if (nextValue <= 0) {
          delete nextIpByRow[ipToken.rowId]
        } else {
          nextIpByRow[ipToken.rowId] = nextValue
        }
        continue
      }

      nextPerks.add(token)
    }

    const perks = sortPerkTokens(Array.from(nextPerks), normalizedMeta.rowOrder)

    normalizedRows.push({
      se: row.se,
      run,
      perks,
      ipByRow: nextIpByRow,
      notes: asText(raw.notes),
    })

    previousPerks = new Set(perks)
    previousIpByRow = cloneIpByRowState(nextIpByRow)
  }
}

normalizedRows.sort((a, b) => {
  if (a.se !== b.se) return a.se - b.se
  return a.run.localeCompare(b.run)
})

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
