import type {
  PerkGuideEntry,
  PerkIpmEntry,
  PerkMetaPerk,
  PerkRowId,
  PerkRowMeta,
  PerkRunType,
} from "../../lib/perkContext"

export type PerkRunOption = {
  value: PerkRunType
  label: string
}

export type PerkGuideRowView = {
  row: PerkRowMeta
  activePerks: PerkMetaPerk[]
  ipm?: PerkIpmEntry
}

export type PerkChangesView = {
  previousSeLabel: string
  text: string
}

export type PerkGuideSelection = {
  selected?: PerkGuideEntry
  selectedPerkSet: Set<string>
  rowViews: PerkGuideRowView[]
  previousSe?: number
}

export type PerkGuideKey = `${PerkRunType}|${number}`

export type PerkRowLookup = Map<PerkRowId, PerkMetaPerk[]>
