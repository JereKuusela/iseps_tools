import {
  getTalentSeExtras,
  talentBase,
  talentDefById,
  talentDefs,
  talentLpNotes,
  talentPathByLp,
  type TalentLevels,
} from "./talentData"

export const TALENT_ROW5_UNLOCK_LP = 47
export const TALENT_ROW6_START_LP = 350
export const TALENT_ROW6_LP_PER_LEVEL = 10
const ROW6_MAX_LP = 300
const ROW6_ORDER = ["IC6-1", "PP6-1", "IC6-3", "PP6-3", "IC6-2", "PP6-2"]
const EXTRA_ORDER = ["PP1-1", "PP2-1", "PP3-1", "IC2-2", "IC2-3", "IC3-3"]
const G_CORP_ZEROED = new Set(["PP1-1", "PP2-1"])
const G_RUN_WEIGHT_MULTIPLIER = 2
const G_RUN_BOOSTED = new Set(["PP5-2", "IC5-1", "IC5-2"])
const SKIPPED_ROW6_NON_SE = new Set(["IC6-3", "PP6-3"])

export type TalentRunType = "se" | "grun" | "jrun"

export type TalentInput = {
  run?: TalentRunType
  se: number
  lp: number
  gCorpMaxed: boolean
  perks: ReadonlySet<string>
}

export type TalentAllocation = {
  levels: TalentLevels
  spentPP: number
  spentIC: number
  unallocated: number
  notes: string[]
}

const hasColor = (perks: ReadonlySet<string>, row: string) => {
  const pattern = new RegExp(`^${row}\\d+$`)
  for (const perk of perks) if (pattern.test(perk)) return true
  return false
}

type Share = { id: string; weight: number; cap: number }

// Weighted split with largest-remainder rounding; capped shares hand their excess to the rest.
const distribute = (pool: number, shares: Share[]) => {
  const result: TalentLevels = {}
  let active = shares.filter((share) => share.weight > 0 && share.cap > 0)
  let remaining = pool

  while (remaining > 0 && active.length > 0) {
    const totalWeight = active.reduce((sum, share) => sum + share.weight, 0)
    const exact = active.map((share) => (remaining * share.weight) / totalWeight)
    const floors = exact.map(Math.floor)
    let leftover = remaining - floors.reduce((sum, value) => sum + value, 0)
    const byRemainder = exact
      .map((value, index) => ({ index, frac: value - floors[index] }))
      .sort((a, b) => b.frac - a.frac)
    for (const { index } of byRemainder) {
      if (leftover <= 0) break
      floors[index] += 1
      leftover -= 1
    }

    const capped = active.filter((share, index) => (result[share.id] ?? 0) + floors[index] >= share.cap)
    if (capped.length === 0) {
      active.forEach((share, index) => (result[share.id] = (result[share.id] ?? 0) + floors[index]))
      remaining = 0
      break
    }

    for (const share of capped) {
      remaining -= share.cap - (result[share.id] ?? 0)
      result[share.id] = share.cap
    }
    active = active.filter((share) => !capped.includes(share))
  }

  return result
}

export const getRow5Weights = (input: Pick<TalentInput, "se" | "lp" | "gCorpMaxed" | "perks" | "run">) => {
  const { se, lp, gCorpMaxed, perks, run } = input
  const gCorpDivisor = gCorpMaxed ? (lp >= 610 ? 1.3 : 4) : 1
  const emblemPerks = ["B7", "O7", "Y7"].filter((perk) => perks.has(perk)).length

  const weights: Record<string, number> = {
    "PP5-1": hasColor(perks, "O") ? 1 : 0,
    "PP5-2": hasColor(perks, "Y") ? 0.195 / gCorpDivisor : 0,
    "PP5-3": hasColor(perks, "P") ? 0.295 : 0,
    "IC5-1": Math.min(0.21, 4.172591290957523e-5 * se ** 2.5),
    "IC5-2": Math.min(1.6, 1e-28 * se ** 18),
    "IC5-3": 1 + 0.1 * emblemPerks,
  }
  if (run === "grun") {
    for (const id of G_RUN_BOOSTED) weights[id] *= G_RUN_WEIGHT_MULTIPLIER
  }
  return weights
}

const sumSide = (levels: TalentLevels, side: "PP" | "IC") => {
  let total = 0
  for (const def of talentDefs) {
    if (def.side !== side) continue
    const level = levels[def.id] ?? 0
    total += def.row === 6 ? level * TALENT_ROW6_LP_PER_LEVEL : level
  }
  return total
}

// Skipped talents in non-SE runs shrink the row 6 budget, so rows 1-5 take that LP instead.
const row6MaxLp = (run?: TalentRunType) => {
  if (!run || run === "se") return ROW6_MAX_LP
  const skipped = [...SKIPPED_ROW6_NON_SE].reduce((sum, id) => sum + (talentDefById.get(id)?.max ?? 0), 0)
  return ROW6_MAX_LP - skipped * TALENT_ROW6_LP_PER_LEVEL
}

const computeLevels = (input: TalentInput, se: number, lp: number): TalentLevels => {
  const extras = getTalentSeExtras(se)
  const row6Max = row6MaxLp(input.run)

  if (lp <= TALENT_ROW5_UNLOCK_LP) return { ...(talentPathByLp[String(lp)] ?? {}) }

  const levels: TalentLevels = { ...talentBase }
  const rows1to5Budget = lp > TALENT_ROW6_START_LP + row6Max ? lp - row6Max : Math.min(lp, TALENT_ROW6_START_LP)
  let pool = rows1to5Budget - Object.values(levels).reduce((sum, level) => sum + level, 0)
  const weights = getRow5Weights({ ...input, se, lp })
  const row5Defs = talentDefs.filter((def) => def.row === 5)

  // Split row 5 by weight, using only as many points as it takes for every usable talent to own one.
  const caps = () =>
    row5Defs.map((def) => ({ id: def.id, weight: weights[def.id] ?? 0, cap: def.max - (levels[def.id] ?? 0) }))
  const usable = row5Defs.filter((def) => (weights[def.id] ?? 0) > 0)
  let needed = pool
  for (let points = 0; points <= pool; points += 1) {
    const split = distribute(points, caps())
    if (usable.every((def) => (levels[def.id] ?? 0) + (split[def.id] ?? 0) >= 1)) {
      needed = points
      break
    }
  }
  const firstSplit = distribute(needed, caps())
  for (const [id, added] of Object.entries(firstSplit)) {
    levels[id] = (levels[id] ?? 0) + added
    pool -= added
  }

  // The G-Corp tick lowers PP1-1 and PP2-1 targets, but PP1-1 never drops below its base level.
  for (const id of EXTRA_ORDER) {
    const target = input.gCorpMaxed && G_CORP_ZEROED.has(id) ? 0 : (extras[id] ?? 0)
    const take = Math.min(Math.max(0, target - (levels[id] ?? 0)), pool)
    levels[id] = (levels[id] ?? 0) + take
    pool -= take
  }

  const row5 = distribute(pool, caps())
  for (const [id, added] of Object.entries(row5)) levels[id] = (levels[id] ?? 0) + added

  let row6Left =
    lp >= TALENT_ROW6_START_LP
      ? Math.min(Math.floor((lp - TALENT_ROW6_START_LP) / TALENT_ROW6_LP_PER_LEVEL) * TALENT_ROW6_LP_PER_LEVEL, row6Max)
      : 0
  for (const id of ROW6_ORDER) {
    if (input.run && input.run !== "se" && SKIPPED_ROW6_NON_SE.has(id)) {
      levels[id] = 0
      continue
    }
    const max = talentDefById.get(id)?.max ?? 0
    const levelsTaken = Math.min(max, Math.floor(row6Left / TALENT_ROW6_LP_PER_LEVEL))
    levels[id] = levelsTaken
    row6Left -= levelsTaken * TALENT_ROW6_LP_PER_LEVEL
  }

  return levels
}

export const computeTalentAllocation = (input: TalentInput): TalentAllocation => {
  const se = Math.max(1, Math.floor(input.se) || 1)
  const lp = Math.max(0, Math.floor(input.lp) || 0)
  const levels = computeLevels(input, se, lp)
  const spentPP = sumSide(levels, "PP")
  const spentIC = sumSide(levels, "IC")

  const notes: string[] = []
  const nonSeRun = input.run !== undefined && input.run !== "se"
  if (nonSeRun) notes.push("Use SE Push during the build up.\nRespec after the last simulation reset.")

  for (const note of talentLpNotes) {
    if (lp >= note.from && (note.to === undefined || lp <= note.to)) notes.push(note.text)
  }
  const row6Leftover = (lp - TALENT_ROW6_START_LP) % TALENT_ROW6_LP_PER_LEVEL
  if (lp > TALENT_ROW6_START_LP && lp < TALENT_ROW6_START_LP + row6MaxLp(input.run) && row6Leftover > 0) {
    notes.push(`${row6Leftover} unallocated LP are saved for row 6.\nIf spent, must respec later.`)
  }

  return { levels, spentPP, spentIC, unallocated: lp - spentPP - spentIC, notes }
}
