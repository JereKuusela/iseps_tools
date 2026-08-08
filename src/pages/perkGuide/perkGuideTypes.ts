import type { PerkGuideEntry, Perk, PerkRowId, Perkrow, PerkRunType } from "../../lib/perkContext"

export type PerkRunOption = {
  value: PerkRunType
  label: string
}

export type PerkGuideRowView = {
  row: Perkrow
  activePerks: Perk[]
  ip: number
  milestones: {
    m1: boolean
    m2: boolean
    m3: boolean
  }
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

export type PerkRowLookup = Map<PerkRowId, Perk[]>
