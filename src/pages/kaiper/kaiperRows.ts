import {
  ampNextIncreaseLog10,
  ampUnlocked,
  costLog10,
  efficiencyLog10,
  nextSequencingDcHit,
  reducerLog10,
  relativeEfficiencies,
  sequencingPosition,
  sumLog10,
} from "./kaiperCalculator"
import type { KaiperData, ReducerLevels } from "./kaiperTypes"

export type KaiperRow = {
  id: string
  group: string
  label: string
  level: number
  resource: string
  maxLevel?: number
  // Cost of the next level, log10; null when unknown or maxed.
  costLog10: number | null
  locked: boolean
  increaseLog10?: number
  efficiencyLog10?: number
  // Share of the best efficiency in the comparison group, 0..1.
  relative?: number | null
}

export type KaiperRowsInput = {
  data: KaiperData
  se: number
  reducers: ReducerLevels
  sequencingBundle: boolean
  levels: Record<string, number>
}

export const levelKey = {
  ampBase: (id: string) => `amp.${id}.base`,
  ampCounter: (id: string) => `amp.${id}.counter`,
  pod: (particle: string) => `pod.${particle}`,
  dc: (particle: string) => `dc.${particle}`,
  dcKappa: "dc.kappa",
  seqKappa: "seq.kappa",
  seqCash: "seq.cash",
}

const nextCost = (family: Parameters<typeof costLog10>[0], level: number, reducer: number) => {
  const cost = costLog10(family, level + 1)
  return cost === null ? null : cost - reducer
}

const applyGroupEfficiency = (rows: KaiperRow[]) => {
  const relative = relativeEfficiencies(rows.map((row) => row.efficiencyLog10 ?? Number.NEGATIVE_INFINITY))
  rows.forEach((row, index) => {
    row.relative = row.locked ? null : relative[index]
  })
}

export const buildKaiperRows = (input: KaiperRowsInput) => {
  const { data, se, reducers, levels } = input
  const level = (key: string) => levels[key] ?? 0
  const ampReducer = reducerLog10(data.reducers.amps, reducers)
  const podReducer = reducerLog10(data.reducers.podAndDc, reducers)
  const seqReducer = reducerLog10(data.reducers.sequencing, reducers)

  const ampRows: KaiperRow[] = []
  for (const amp of data.amps) {
    const locked = !ampUnlocked(amp, se)
    const base = level(levelKey.ampBase(amp.id))
    const counter = level(levelKey.ampCounter(amp.id))
    const group = `amp.${amp.id}`
    const pair = (["base", "counter"] as const).map((kind): KaiperRow => {
      const cost = nextCost(kind === "base" ? amp.base : amp.counter, kind === "base" ? base : counter, ampReducer)
      const increase = locked ? 0 : ampNextIncreaseLog10(amp, se, base, counter, kind)
      return {
        id: kind === "base" ? levelKey.ampBase(amp.id) : levelKey.ampCounter(amp.id),
        group,
        label: `${amp.label} ${kind === "base" ? "Base" : "Counter"}`,
        level: kind === "base" ? base : counter,
        resource: "kappa",
        costLog10: cost,
        locked,
        increaseLog10: increase,
        efficiencyLog10: locked ? Number.NEGATIVE_INFINITY : efficiencyLog10(increase, cost),
      }
    })
    applyGroupEfficiency(pair)
    ampRows.push(...pair)
  }

  const particleRows: KaiperRow[] = []
  for (const pod of data.genesisPod) {
    const current = level(levelKey.pod(pod.particle))
    particleRows.push({
      id: levelKey.pod(pod.particle),
      group: "pod",
      label: `${pod.particle} Genesis Pod`,
      level: current,
      resource: pod.particle,
      maxLevel: pod.family.maxLevel,
      costLog10: nextCost(pod.family, current, podReducer),
      locked: false,
    })
  }
  for (const dc of data.dataCenter) {
    const current = level(levelKey.dc(dc.particle))
    particleRows.push({
      id: levelKey.dc(dc.particle),
      group: "dc",
      label: `${dc.particle} Data Center`,
      level: current,
      resource: dc.particle,
      costLog10: nextCost(dc.family, current, podReducer),
      locked: false,
    })
  }

  const dcKappaLevel = level(levelKey.dcKappa)
  const dcKappaCost = nextCost(data.dataCenterKappa, dcKappaLevel, podReducer)
  const dcKappaIncrease = Math.log10(data.kappaLevelDcMultiplier)

  const seqKappaLevel = level(levelKey.seqKappa)
  const seqCashLevel = level(levelKey.seqCash)
  const position = sequencingPosition(seqKappaLevel, seqCashLevel, input.sequencingBundle, data)
  const hit = nextSequencingDcHit(position, data)
  const pathCosts = Array.from({ length: hit.steps }, (_, index) =>
    nextCost(data.sequencingKappa, seqKappaLevel + index, seqReducer),
  )
  const seqPathCost = pathCosts.some((cost) => cost === null) ? null : sumLog10(pathCosts as number[])

  const otherRows: KaiperRow[] = [
    {
      id: levelKey.dcKappa,
      group: "dc",
      label: "Kappa Data Center",
      level: dcKappaLevel,
      resource: "kappa",
      costLog10: dcKappaCost,
      locked: false,
    },
    {
      id: levelKey.seqKappa,
      group: "seq",
      label: "Sequencing (Kappa)",
      level: seqKappaLevel,
      resource: "kappa",
      costLog10: nextCost(data.sequencingKappa, seqKappaLevel, seqReducer),
      locked: false,
    },
    {
      id: levelKey.seqCash,
      group: "seq",
      label: "Sequencing (Cash)",
      level: seqCashLevel,
      resource: "cash",
      costLog10: nextCost(data.sequencingCash, seqCashLevel, seqReducer),
      locked: false,
    },
  ]

  const ampById = (id: string) => ampRows.filter((row) => row.group === `amp.${id}`)
  const [apBase, apCounter] = ampById("ap")
  const [dcBase, dcCounter] = ampById("dc")

  // AP and DC amplifiers feed DC 1:1, so all entries share one DC multiplier scale.
  const dcComparison: KaiperRow[] = [
    { ...apBase, id: `cmp.${apBase.id}` },
    { ...apCounter, id: `cmp.${apCounter.id}` },
    { ...dcBase, id: `cmp.${dcBase.id}` },
    { ...dcCounter, id: `cmp.${dcCounter.id}` },
    {
      id: "cmp.dcKappa",
      group: "dcComparison",
      label: "Kappa Data Center",
      level: dcKappaLevel,
      resource: "kappa",
      costLog10: dcKappaCost,
      locked: false,
      increaseLog10: dcKappaIncrease,
      efficiencyLog10: efficiencyLog10(dcKappaIncrease, dcKappaCost),
    },
    {
      id: "cmp.seq",
      group: "dcComparison",
      label: `Sequencing (${hit.steps} step${hit.steps === 1 ? "" : "s"})`,
      level: position,
      resource: "kappa",
      costLog10: seqPathCost,
      locked: false,
      increaseLog10: hit.gainLog10,
      efficiencyLog10: efficiencyLog10(hit.gainLog10, seqPathCost),
    },
  ]
  applyGroupEfficiency(dcComparison)

  return { ampRows, particleRows, otherRows, dcComparison, sequencing: { position, ...hit } }
}
