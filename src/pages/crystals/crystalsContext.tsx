import { createContext, createMemo, type ParentProps, useContext } from "solid-js"
import { getCrystalKey } from "../../lib/crystalSharedInputs"
import { parseNumberish } from "../../lib/parseNumber"
import { PARTICLE_ORDER, type UnlockedParticle } from "../../lib/particles"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { SHARED_PLAYER_LEVEL_KEY, SHARED_SE_KEY } from "../../lib/tokenSharedInputs"
import {
  applyCrystalActions,
  calculateCrystalRecommendations,
  calculateCrystalsSpent,
  isUpgradeUnlocked,
  levelOf,
} from "./crystalCalculator"
import { CRYSTAL_DATA } from "./crystalData"
import type {
  CrystalCost,
  CrystalInputState,
  CrystalLevels,
  CrystalRecommendation,
  CrystalUpgrade,
} from "./crystalTypes"

const UPCOMING_ACTION_COUNT = 8

type CrystalsContextValue = {
  se: () => string
  setSe: (next: string) => string
  playerLevel: () => string
  setPlayerLevel: (next: string) => string
  unlockedParticle: () => UnlockedParticle
  setUnlockedParticle: (next: UnlockedParticle) => UnlockedParticle
  upgrades: () => CrystalUpgrade[]
  levelText: (id: string) => string
  setLevel: (id: string, next: string) => void
  isUnlocked: (id: string) => boolean
  recommendation: () => CrystalRecommendation
  crystalsSpent: () => CrystalCost
  applyBest: () => void
  applyCount: (count: number) => void
  applyStep: () => void
}

const CrystalsContext = createContext<CrystalsContextValue>()

export const CrystalsProvider = (props: ParentProps) => {
  const [se, setSe] = createSyncedSignal(SHARED_SE_KEY, "1")
  const [playerLevel, setPlayerLevel] = createSyncedSignal(SHARED_PLAYER_LEVEL_KEY, "0")
  const [unlockedParticle, setUnlockedParticle] = createSyncedSignal<UnlockedParticle>(
    "token.unlockedParticle",
    "kappa",
  )

  const upgradeById = new Map(CRYSTAL_DATA.upgrades.map((upgrade) => [upgrade.id, upgrade] as const))
  const levelSignals = new Map(
    CRYSTAL_DATA.upgrades.map((upgrade) => [upgrade.id, createSyncedSignal(getCrystalKey(upgrade.id), "0")] as const),
  )

  const clampLevel = (id: string, raw: string) => {
    const maxLevel = upgradeById.get(id)?.maxLevel ?? 0
    const parsed = Math.floor(parseNumberish(raw))
    return Number.isFinite(parsed) ? Math.min(maxLevel, Math.max(0, parsed)) : 0
  }

  const levels = createMemo<CrystalLevels>(() => {
    const result: CrystalLevels = {}
    for (const [id, [read]] of levelSignals) result[id] = clampLevel(id, read())
    return result
  })

  const state = createMemo<CrystalInputState>(() => ({
    se: Math.max(0, Math.floor(parseNumberish(se()))),
    playerLevel: Math.max(0, Math.floor(parseNumberish(playerLevel()))),
    unlockedParticle: PARTICLE_ORDER.includes(unlockedParticle()) ? unlockedParticle() : "kappa",
    levels: levels(),
  }))

  const recommendation = createMemo(() => calculateCrystalRecommendations(state(), CRYSTAL_DATA, UPCOMING_ACTION_COUNT))
  const crystalsSpent = createMemo(() => calculateCrystalsSpent(levels(), CRYSTAL_DATA))

  // Per-id memos so a level change only re-renders rows whose unlock state actually flipped.
  const unlockedById = new Map(
    CRYSTAL_DATA.upgrades.map(
      (upgrade) => [upgrade.id, createMemo(() => isUpgradeUnlocked(upgrade, state(), upgradeById))] as const,
    ),
  )

  const setLevel = (id: string, next: string) => {
    levelSignals.get(id)?.[1](String(clampLevel(id, next)))
  }

  const writeLevels = (next: CrystalLevels) => {
    for (const [id, level] of Object.entries(next)) {
      if (level !== levelOf(levels(), id)) setLevel(id, String(level))
    }
  }

  return (
    <CrystalsContext.Provider
      value={{
        se,
        setSe,
        playerLevel,
        setPlayerLevel,
        unlockedParticle,
        setUnlockedParticle,
        upgrades: () => CRYSTAL_DATA.upgrades,
        levelText: (id) => String(levels()[id] ?? 0),
        setLevel,
        isUnlocked: (id) => unlockedById.get(id)?.() ?? false,
        recommendation,
        crystalsSpent,
        applyBest: () => {
          const best = recommendation().actions[0]
          if (best) setLevel(best.id, String(best.currentLevel + 1))
        },
        applyCount: (count) => writeLevels(applyCrystalActions(state(), CRYSTAL_DATA, count)),
        applyStep: () => writeLevels(applyCrystalActions(state(), CRYSTAL_DATA, "step")),
      }}
    >
      {props.children}
    </CrystalsContext.Provider>
  )
}

export const useCrystalsContext = (): CrystalsContextValue => {
  const context = useContext(CrystalsContext)
  if (!context) throw new Error("useCrystalsContext must be used inside CrystalsProvider")
  return context
}
