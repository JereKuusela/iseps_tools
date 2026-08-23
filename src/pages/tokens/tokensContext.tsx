import { createContext, createMemo, createResource, type ParentProps, useContext } from "solid-js"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { getTokenKey, TOKEN_SHARED_KEYS } from "../../lib/tokenSharedInputs"
import { calculateTokenRecommendations, calculateTotalTokensSpent } from "./tokenCalculator"
import { loadTokenData } from "./tokenData"
import { OUTPUT_RESOURCES, type TokenLevelMap, type TokenUpgradeDefinition, type TokenId } from "./tokenTypes"
import tokenUpgradeDefinitions from "../../../data/token_upgrade_definitions.json"

const parseNumberish = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const createDefaultLevelMap = (ids: string[]): TokenLevelMap => {
  const result: TokenLevelMap = {}
  for (const id of ids) result[id] = "0"
  return result
}

export const PARTICLE_ORDER = [
  "alpha",
  "beta",
  "ceti",
  "delta",
  "epsilon",
  "fenix",
  "gamma",
  "helion",
  "ixion",
  "juno",
  "kappa",
] as const

export type UnlockedParticle = (typeof PARTICLE_ORDER)[number]

const BLEND_STEP_TO_SHORT_TERM_PERCENT = [0, 0.5, 1] as const
const TOKEN_UPGRADE_IDS = tokenUpgradeDefinitions.upgrades.map((upgrade) => upgrade.id as TokenId)

type TokensContextValue = {
  isLoading: () => boolean
  loadError: () => string | null
  blendStep: () => string
  setBlendStep: (next: string) => string
  blendPercent: () => number
  granularity: () => string
  setGranularity: (next: string) => string
  onlineHoursPerDay: () => string
  setOnlineHoursPerDay: (next: string) => string
  unlockedParticle: () => UnlockedParticle
  setUnlockedParticle: (next: UnlockedParticle) => UnlockedParticle
  unlockGammaSuppliesBbBot: () => boolean
  setUnlockGammaSuppliesBbBot: (checked: boolean) => boolean
  unlockHelionSuppliesBbBot: () => boolean
  setUnlockHelionSuppliesBbBot: (checked: boolean) => boolean
  outputLevelsByResource: () => TokenLevelMap
  setOutputLevelByResource: (resource: string, next: string) => void
  levels: () => TokenLevelMap
  setUpgradeLevel: (upgradeId: TokenId, next: string) => void
  upgrades: () => TokenUpgradeDefinition[]
  recommendationRows: () => ReturnType<typeof calculateTokenRecommendations>["rows"]
  bestRecommendation: () => ReturnType<typeof calculateTokenRecommendations>["best"]
  totalTokensSpent: () => number
  applyBest: () => void
  applyBestAll: () => void
  applyBestCount: (count: number) => void
}

const TokensContext = createContext<TokensContextValue>()

export const TokensProvider = (props: ParentProps) => {
  const [tokenData] = createResource(loadTokenData)

  const [blendStep, setBlendStep] = createSyncedSignal("token.blendStep", "1")
  const [granularity, setGranularity] = createSyncedSignal("token.granularity", "25")

  const [onlineHoursPerDay, setOnlineHoursPerDay] = createSyncedSignal(TOKEN_SHARED_KEYS.onlineHoursPerDay, "10")
  const [unlockedParticle, setUnlockedParticle] = createSyncedSignal<UnlockedParticle>(
    "token.unlockedParticle",
    "kappa",
  )
  const [unlockGammaSuppliesBbBot, setUnlockGammaSuppliesBbBot] = createSyncedSignal(
    "token.unlockGammaSuppliesBbBot",
    true,
  )
  const [unlockHelionSuppliesBbBot, setUnlockHelionSuppliesBbBot] = createSyncedSignal(
    "token.unlockHelionSuppliesBbBot",
    true,
  )

  const upgradeLevelSignals = new Map(
    TOKEN_UPGRADE_IDS.map((upgradeId) => [upgradeId, createSyncedSignal(getTokenKey(upgradeId), "0")] as const),
  )

  const readUpgradeLevel = (upgradeId: TokenId) => {
    const signal = upgradeLevelSignals.get(upgradeId)
    return signal ? signal[0]() : "0"
  }

  const writeUpgradeLevel = (upgradeId: TokenId, next: string) => {
    const signal = upgradeLevelSignals.get(upgradeId)
    if (!signal) return
    signal[1](next)
  }

  const normalizedLevels = createMemo(() => {
    const ids = tokenData()?.upgrades.map((upgrade) => upgrade.id) ?? []
    const result = createDefaultLevelMap(ids)

    for (const id of ids as TokenId[]) {
      result[id] = readUpgradeLevel(id)
    }

    return result
  })

  const blendPercent = createMemo(() => {
    const parsed = Math.max(0, Math.min(2, Math.floor(parseNumberish(blendStep()))))
    return BLEND_STEP_TO_SHORT_TERM_PERCENT[parsed] ?? 0.5
  })

  const resourceRank = createMemo(() => {
    const rank = new Map<string, number>()
    PARTICLE_ORDER.forEach((id, index) => rank.set(id, index))
    return rank
  })

  const normalizedEnabled = createMemo(() => {
    const upgrades = tokenData()?.upgrades ?? []
    const currentUnlocked = unlockedParticle()
    const unlockedRank = resourceRank().get(currentUnlocked) ?? Number.POSITIVE_INFINITY
    const result: Record<string, boolean> = {}

    for (const upgrade of upgrades) {
      if (!upgrade.resource) {
        result[upgrade.id] = true
        continue
      }

      if (upgrade.group === "output") {
        if (upgrade.resource === "cash") {
          result[upgrade.id] = true
          continue
        }

        const rank = resourceRank().get(upgrade.resource) ?? Number.POSITIVE_INFINITY
        result[upgrade.id] = rank <= unlockedRank
        continue
      }

      if (upgrade.group === "supplies" || upgrade.group === "bbbot") {
        if (upgrade.resource === "gamma") {
          result[upgrade.id] = unlockGammaSuppliesBbBot()
          continue
        }

        if (upgrade.resource === "helion") {
          result[upgrade.id] = unlockHelionSuppliesBbBot()
          continue
        }

        result[upgrade.id] = true
        continue
      }

      result[upgrade.id] = true
    }

    return result
  })

  const normalizedOutputLevels = createMemo(() => {
    const levelMap = normalizedLevels()
    const result = createDefaultLevelMap(OUTPUT_RESOURCES)

    for (const resource of OUTPUT_RESOURCES) {
      result[resource] = levelMap[`output.${resource}`] ?? "0"
    }

    return {
      ...result,
    }
  })

  const recommendation = createMemo(() =>
    calculateTokenRecommendations(
      {
        levels: normalizedLevels(),
        enabled: normalizedEnabled(),
        outputLevelsByResource: normalizedOutputLevels(),
        blendPercent: blendPercent(),
        granularity: granularity(),
        onlineHoursPerDay: onlineHoursPerDay(),
      },
      tokenData() ?? null,
    ),
  )

  const totalTokensSpent = createMemo(() =>
    calculateTotalTokensSpent(
      {
        levels: normalizedLevels(),
        enabled: normalizedEnabled(),
        outputLevelsByResource: normalizedOutputLevels(),
        blendPercent: blendPercent(),
        granularity: granularity(),
        onlineHoursPerDay: onlineHoursPerDay(),
      },
      tokenData() ?? null,
    ),
  )

  const setOutputLevelByResource = (resource: string, next: string) => {
    const normalized = String(Math.max(0, Math.floor(parseNumberish(next))))
    writeUpgradeLevel(`output.${resource}` as TokenId, normalized)
  }

  const setUpgradeLevel = (upgradeId: TokenId, next: string) => {
    const normalized = String(Math.max(0, Math.floor(parseNumberish(next))))
    writeUpgradeLevel(upgradeId, normalized)
  }

  const applyBest = () => {
    const best = recommendation().best
    if (!best || best.nextLevel === null) return

    const upgrade = tokenData()?.upgrades.find((candidate) => candidate.id === best.id)
    if (!upgrade) return

    const nextSingleLevel = Math.min(upgrade.maxLevel, best.currentLevel + 1)

    if (upgrade.group === "output" && upgrade.resource) {
      setOutputLevelByResource(upgrade.resource, String(nextSingleLevel))
      return
    }

    setUpgradeLevel(best.id, String(nextSingleLevel))
  }

  const applyRecommendationToLevel = (
    recommendationRow: NonNullable<ReturnType<typeof calculateTokenRecommendations>["best"]>,
    targetLevel: number,
  ) => {
    const upgrade = tokenData()?.upgrades.find((candidate) => candidate.id === recommendationRow.id)
    if (!upgrade) return

    const clampedTargetLevel = Math.max(
      recommendationRow.currentLevel,
      Math.min(upgrade.maxLevel, Math.floor(targetLevel)),
    )
    if (clampedTargetLevel <= recommendationRow.currentLevel) return

    if (upgrade.group === "output" && upgrade.resource) {
      setOutputLevelByResource(upgrade.resource, String(clampedTargetLevel))
      return
    }

    setUpgradeLevel(recommendationRow.id, String(clampedTargetLevel))
  }

  const applyBestAll = () => {
    const best = recommendation().best
    if (!best || best.nextLevel === null) return

    applyRecommendationToLevel(best, best.nextLevel)
  }

  const applyBestCount = (count: number) => {
    const best = recommendation().best
    if (!best || best.nextLevel === null) return

    const requestedLevels = Math.max(0, Math.floor(count))
    if (requestedLevels <= 0) return

    const cappedTargetLevel = Math.min(best.nextLevel, best.currentLevel + requestedLevels)
    applyRecommendationToLevel(best, cappedTargetLevel)
  }

  return (
    <TokensContext.Provider
      value={{
        isLoading: () => tokenData.loading,
        loadError: () => (tokenData.error ? String(tokenData.error) : null),
        blendStep,
        setBlendStep,
        blendPercent,
        granularity,
        setGranularity,
        onlineHoursPerDay,
        setOnlineHoursPerDay,
        unlockedParticle,
        setUnlockedParticle,
        unlockGammaSuppliesBbBot,
        setUnlockGammaSuppliesBbBot,
        unlockHelionSuppliesBbBot,
        setUnlockHelionSuppliesBbBot,
        outputLevelsByResource: normalizedOutputLevels,
        setOutputLevelByResource,
        levels: normalizedLevels,
        setUpgradeLevel,
        upgrades: () => tokenData()?.upgrades ?? [],
        recommendationRows: () => recommendation().rows,
        bestRecommendation: () => recommendation().best,
        totalTokensSpent,
        applyBest,
        applyBestAll,
        applyBestCount,
      }}
    >
      {props.children}
    </TokensContext.Provider>
  )
}

export const useTokensContext = (): TokensContextValue => {
  const context = useContext(TokensContext)
  if (!context) throw new Error("useTokensContext must be used inside TokensProvider")
  return context
}
