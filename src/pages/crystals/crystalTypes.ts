import type { UnlockedParticle } from "../../lib/particles"

export type CrystalGroup = "output" | "cost" | "special" | "oneTimer"

export type CrystalRequirements = {
  particle?: UnlockedParticle
  se?: number
  playerLevel?: number
  upgrades: { id: string; level: number }[]
}

export type CrystalUpgrade = {
  id: string
  name: string
  group: CrystalGroup
  particle?: UnlockedParticle
  baseCost: number | null
  costStep: number
  // Explicit cost per level (index 0 = level 1); overrides baseCost/costStep.
  costs?: number[]
  maxLevel: number
  requires: CrystalRequirements
}

export type CrystalTargetLevel = number | "max"

export type CrystalGuideStep = {
  id: string
  minSe?: number
  maxSe?: number
  doneNote?: string
  targets: { id: string; level: CrystalTargetLevel }[]
}

export type CrystalData = {
  upgrades: CrystalUpgrade[]
  steps: CrystalGuideStep[]
}

export type CrystalLevels = Record<string, number>

export type CrystalInputState = {
  se: number
  playerLevel: number
  unlockedParticle: UnlockedParticle
  levels: CrystalLevels
}

export type CrystalCost = {
  cost: number
  // True when at least one level in the range has no known price.
  unknown: boolean
}

export type CrystalAction = {
  id: string
  name: string
  currentLevel: number
  targetLevel: number
  maxLevel: number
  cost: CrystalCost
  stepId: string
}

export type CrystalRecommendation = {
  actions: CrystalAction[]
  step: CrystalGuideStep | null
  stepIndex: number
  // Locked upgrades the user should save crystals for.
  savingFor: { names: string[]; cost: CrystalCost }
  doneNotes: string[]
}
