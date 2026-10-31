import talentsJson from "../../../data/talents.json"

export type TalentSide = "PP" | "IC"

export type TalentDef = {
  id: string
  side: TalentSide
  row: number
  col: number
  name: string
  max: number
  tooltip: string
}

export type TalentLevels = Record<string, number>

type RawSeEntry = {
  se: number
  add: string | string[]
}

export const talentGrid = talentsJson.grid as Record<TalentSide, (string | null)[][]>
export const talentDefs = talentsJson.talents as TalentDef[]
export const talentConnections = talentsJson.connections as [string, string][]
export const talentPathByLp = talentsJson.pathByLp as Record<string, TalentLevels>
export const talentBase = talentsJson.base as TalentLevels
export const talentLpNotes = talentsJson.lpNotes as { from: number; to?: number; text: string }[]

export const talentDefById = new Map(talentDefs.map((def) => [def.id, def]))

const seEntries = (talentsJson.extrasBySe as RawSeEntry[]).slice().sort((a, b) => a.se - b.se)

// Tokens are a talent id with an optional amount, e.g. "PP1-1" (+1) or "3 PP1-1" (+3).
const parseAddToken = (token: string): [string, number] => {
  const match = token.trim().match(/^(?:(-?\d+)\s+)?(\S+)$/)
  return [match?.[2] ?? token, Number(match?.[1] ?? 1)]
}

// Extra target levels at an SE are the sum of all additions up to and including it.
export const getTalentSeExtras = (se: number) => {
  const extras: Record<string, number> = {}
  for (const entry of seEntries) {
    if (entry.se > se) break
    for (const token of [entry.add].flat()) {
      const [id, delta] = parseAddToken(token)
      extras[id] = Math.max(0, (extras[id] ?? 0) + delta)
    }
  }
  return extras
}
