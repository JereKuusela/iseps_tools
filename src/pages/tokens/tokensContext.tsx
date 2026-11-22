import { batch, createContext, createMemo, createResource, type ParentProps, useContext } from "solid-js"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { getTokenKey, SHARED_SE_KEY, TOKEN_SHARED_KEYS } from "../../shared/tokenSharedInputs"
import {
  calculateTokenRecommendations,
  calculateTokenSpendingReport,
  getTokenUnmetRequirements,
  type UnmetTokenRequirement,
} from "./tokensCalculator"
import { loadTokenData, TOKEN_UPGRADES } from "./tokensData"
import { OUTPUT_RESOURCES, type TokenLevelMap, type TokenUpgradeDefinition, type TokenId } from "./tokensTypes"
import { parseNumberish } from "../../lib/parseNumber"
import { PARTICLE_ORDER, type UnlockedParticle } from "../../lib/particles"

const createDefaultLevelMap = (ids: string[]): TokenLevelMap => {
  const result: TokenLevelMap = {}
  for (const id of ids) result[id] = "0"
  return result
}

const TOKEN_UPGRADE_IDS = TOKEN_UPGRADES.map((upgrade) => upgrade.id)

type TokensContextValue = {
  isLoading: () => boolean
  loadError: () => string | null
  tokensPerStep: () => string
  setTokensPerStep: (next: string) => string
  onlineHoursPerDay: () => string
  setOnlineHoursPerDay: (next: string) => string
  currentSe: () => string
  setCurrentSe: (next: string) => string
  unlockedParticle: () => UnlockedParticle
  setUnlockedParticle: (next: UnlockedParticle) => UnlockedParticle
  unmetRequirements: (id: TokenId) => UnmetTokenRequirement[]
  outputLevelsByResource: () => TokenLevelMap
  setOutputLevelByResource: (resource: string, next: string) => void
  levels: () => TokenLevelMap
  setUpgradeLevel: (upgradeId: TokenId, next: string) => void
  upgrades: () => TokenUpgradeDefinition[]
  recommendationRows: () => ReturnType<typeof calculateTokenRecommendations>["rows"]
  bestRecommendation: () => ReturnType<typeof calculateTokenRecommendations>["best"]
  bestSpecialRecommendation: () => ReturnType<typeof calculateTokenRecommendations>["bestSpecial"]
  totalTokensSpent: () => number
  spendingReport: () => ReturnType<typeof calculateTokenSpendingReport>
  applyBest: () => void
  applyBestSpecial: () => void
  applyBestAll: () => void
  applyBestCount: (count: number) => void
  completeAll: () => void
  resetAll: () => void
}

const TokensContext = createContext<TokensContextValue>()

export const TokensProvider = (props: ParentProps) => {
  const [tokenData] = createResource(loadTokenData)

  const [tokensPerStep, setTokensPerStep] = createSyncedSignal("token.tokensPerStep", "100")

  const [onlineHoursPerDay, setOnlineHoursPerDay] = createSyncedSignal(TOKEN_SHARED_KEYS.onlineHoursPerDay, "10")
  const [unlockedParticle, setUnlockedParticle] = createSyncedSignal<UnlockedParticle>(
    "token.unlockedParticle",
    "kappa",
  )
  const [currentSe, setCurrentSe] = createSyncedSignal(SHARED_SE_KEY, "1")
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
    const ids = TOKEN_UPGRADE_IDS
    const result = createDefaultLevelMap(ids)

    for (const id of ids as TokenId[]) {
      result[id] = readUpgradeLevel(id)
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

  const requirementInput = createMemo(() => ({
    se: Math.max(0, Math.floor(parseNumberish(currentSe()))),
    unlockedParticle: unlockedParticle(),
    levels: normalizedLevels(),
  }))

  const unmetById = createMemo(
    () =>
      new Map(TOKEN_UPGRADES.map((upgrade) => [upgrade.id, getTokenUnmetRequirements(upgrade, requirementInput())])),
  )

  const recommendation = createMemo(() =>
    calculateTokenRecommendations(
      {
        ...requirementInput(),
        levels: normalizedLevels(),
        enabled: {},
        outputLevelsByResource: normalizedOutputLevels(),
        tokensPerStep: tokensPerStep(),
        onlineHoursPerDay: onlineHoursPerDay(),
        deltaLikeCeti: PARTICLE_ORDER.indexOf(unlockedParticle()) < PARTICLE_ORDER.indexOf("helion"),
      },
      tokenData() ?? null,
    ),
  )

  const spendingReport = createMemo(() =>
    calculateTokenSpendingReport(
      {
        levels: normalizedLevels(),
        enabled: {},
        outputLevelsByResource: normalizedOutputLevels(),
        tokensPerStep: tokensPerStep(),
        onlineHoursPerDay: onlineHoursPerDay(),
      },
      tokenData() ?? null,
    ),
  )

  const totalTokensSpent = createMemo(() => spendingReport().total)

  const setOutputLevelByResource = (resource: string, next: string) => {
    const normalized = String(Math.max(0, Math.floor(parseNumberish(next))))
    writeUpgradeLevel(`output.${resource}` as TokenId, normalized)
  }

  const setUpgradeLevel = (upgradeId: TokenId, next: string) => {
    const normalized = String(Math.max(0, Math.floor(parseNumberish(next))))
    writeUpgradeLevel(upgradeId, normalized)
  }

  const applyRecommendationToLevel = (
    recommendationRow: NonNullable<ReturnType<typeof calculateTokenRecommendations>["best"]>,
    targetLevel: number,
  ) => {
    const upgrade = TOKEN_UPGRADES.find((candidate) => candidate.id === recommendationRow.id)
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

  const applySingleLevel = (row: ReturnType<typeof calculateTokenRecommendations>["best"]) => {
    if (row?.nextLevel != null) applyRecommendationToLevel(row, row.currentLevel + 1)
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

    applyRecommendationToLevel(best, best.currentLevel + requestedLevels)
  }

  const resetAll = () => {
    for (const upgradeId of TOKEN_UPGRADE_IDS as TokenId[]) writeUpgradeLevel(upgradeId, "0")
  }

  return (
    <TokensContext.Provider
      value={{
        isLoading: () => tokenData.loading,
        loadError: () => (tokenData.error ? String(tokenData.error) : null),
        tokensPerStep,
        setTokensPerStep,
        onlineHoursPerDay,
        setOnlineHoursPerDay,
        currentSe,
        setCurrentSe,
        unlockedParticle,
        setUnlockedParticle,
        unmetRequirements: (id) => unmetById().get(id) ?? [],
        outputLevelsByResource: normalizedOutputLevels,
        setOutputLevelByResource,
        levels: normalizedLevels,
        setUpgradeLevel,
        upgrades: () => TOKEN_UPGRADES,
        recommendationRows: () => recommendation().rows,
        bestRecommendation: () => recommendation().best,
        bestSpecialRecommendation: () => recommendation().bestSpecial,
        totalTokensSpent,
        spendingReport,
        applyBest: () => applySingleLevel(recommendation().best),
        applyBestSpecial: () => applySingleLevel(recommendation().bestSpecial),
        applyBestAll,
        applyBestCount,
        completeAll: () =>
          batch(() => {
            for (const upgrade of TOKEN_UPGRADES) writeUpgradeLevel(upgrade.id, String(upgrade.maxLevel))
          }),
        resetAll,
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
