export type StepRule = {
  from: number
  mult?: number
  exp?: number
  // true: add to the running step instead of replacing it.
  boost?: boolean
}

// All costs are log10 values; `level` is the 1-based level being bought.
export type CostFamily = {
  initial?: number
  anchor?: { level: number; cost: number }
  steps: StepRule[]
  maxLevel?: number
  overrides?: Record<number, number>
}

export type CostReducer = {
  dcm: { level: number; div: number }
  og: { id: number; div: number }
  qa: { id: number; div: number }
}

export type AmpDefinition = {
  id: string
  label: string
  init: number
  step: number
  unlockSe: number
  base: CostFamily
  counter: CostFamily
}

export type ParticleCostDefinition = { particle: string; family: CostFamily; step?: number }

export type SequencingEffect = { id: string; label: string; mult: number; every: number; bonus: number }

export type KaiperData = {
  amps: AmpDefinition[]
  genesisPod: ParticleCostDefinition[]
  dataCenter: ParticleCostDefinition[]
  dataCenterKappa: CostFamily
  kappaLevelDcMultiplier: number
  otherLevelDcMultiplier: number
  sequencingKappa: CostFamily
  sequencingCash: CostFamily
  sequencingEffects: SequencingEffect[]
  sequencingFill: number
  sequencingBundlePositions: number
  reducers: { amps: CostReducer; podAndDc: CostReducer; sequencing: CostReducer }
}

export type KappaExponentRule = {
  type: "research" | "dcm" | "player" | "og" | "crystal"
  level?: number
  id?: number | string
  exp?: number
  expPerLevel?: number
}

export type ReducerLevels = { dcmLevel: number; ogLevels: number[]; qaLevels: Record<number, number> }
