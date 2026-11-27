import { createContext, createMemo, useContext, type ParentProps } from "solid-js"
import { estimateSeconds, fromLog10 } from "../../lib/eta"
import type { LargeNumber } from "../../lib/largeNumber"
import { PARTICLE_ORDER, type UnlockedParticle } from "../../lib/particles"
import { parseNumberish } from "../../lib/parseNumber"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { createCrystalFlagSignal } from "../../shared/crystalFlags"
import { useCashInputs, useParticleInputs } from "../../shared/particleInputs"
import {
  getCrystalKey,
  getTokenKey,
  SHARED_DCM_LEVEL_KEY,
  SHARED_PLAYER_LEVEL_KEY,
  SHARED_RESEARCH_LEVEL_KEY,
  SHARED_SE_KEY,
} from "../../shared/storageKeys"
import { calculateExponentIncreaseMultipliers, calculateTotalPremiumMultiplier } from "../../shared/zatCalculator"
import { kappaExponentFromRules } from "./kaiperCalculator"
import { KAIPER_DATA, KAPPA_EXPONENT_RULES, KAPPA_PREMIUM_RULES } from "./kaiperData"
import { buildKaiperRows, levelKey, type KaiperRow } from "./kaiperRows"

const QA_IDS = [21, 22, 23] as const
const GENESIS_POD_EXPONENT = 0.001
const EXPONENT_DELTAS = [0.001, 0.005, 0.01]

const levelKeys = [
  ...KAIPER_DATA.amps.flatMap((amp) => [levelKey.ampBase(amp.id), levelKey.ampCounter(amp.id)]),
  ...KAIPER_DATA.genesisPod.map((pod) => levelKey.pod(pod.particle)),
  ...KAIPER_DATA.dataCenter.map((dc) => levelKey.dc(dc.particle)),
  levelKey.dcKappa,
  levelKey.seqKappa,
  levelKey.seqCash,
]

export type UpcomingRow = KaiperRow & { etaSeconds: number }

const createKaiperContext = () => {
  const [se, setSe] = createSyncedSignal(SHARED_SE_KEY, "1")
  const [playerLevel] = createSyncedSignal(SHARED_PLAYER_LEVEL_KEY, "0")
  const [researchLevel, setResearchLevel] = createSyncedSignal(SHARED_RESEARCH_LEVEL_KEY, "0")
  const [dcmLevel, setDcmLevel] = createSyncedSignal(SHARED_DCM_LEVEL_KEY, "0")
  const [techLevels] = createSyncedSignal<number[]>("zat.og.techLevels", [])
  const [baseExponent, setBaseExponent] = createSyncedSignal("kaiper.baseExponent", "0.01")
  const [extraExponent, setExtraExponent] = createSyncedSignal("kaiper.extraExponent", "0")

  const levelSignals = Object.fromEntries(
    levelKeys.map((key) => [key, createSyncedSignal(`kaiper.${key}`, "0")] as const),
  )
  const qaSignals = Object.fromEntries(QA_IDS.map((id) => [id, createSyncedSignal(`kaiper.qa${id}`, "0")] as const))

  const [kappaOutput] = createSyncedSignal(getCrystalKey("output.kappa"), "0")
  const [kappaBundle] = createCrystalFlagSignal("bundle.kappa")
  const [junoKappaBundle] = createCrystalFlagSignal("bundle.junoKappa")
  const [meltdownBundle, setMeltdownBundle] = createCrystalFlagSignal("bundle.meltdown")
  const [sequencingBundle, setSequencingBundle] = createCrystalFlagSignal("bundle.sequencing")
  const [kappaTokens] = createSyncedSignal(getTokenKey("output.kappa"), "0")

  const kappa = useParticleInputs("kappa")
  const cash = useCashInputs()
  const particleInputs = Object.fromEntries(
    PARTICLE_ORDER.map((particle) => [particle, useParticleInputs(particle)]),
  ) as Record<UnlockedParticle, ReturnType<typeof useParticleInputs>>

  const levels = createMemo(() =>
    Object.fromEntries(Object.entries(levelSignals).map(([key, [value]]) => [key, parseNumberish(value())])),
  )
  const setLevel = (key: string, next: string) => levelSignals[key]?.[1](next)

  const seNumber = createMemo(() => parseNumberish(se()))
  const reducers = createMemo(() => ({
    dcmLevel: parseNumberish(dcmLevel()),
    ogLevels: techLevels(),
    qaLevels: Object.fromEntries(QA_IDS.map((id) => [id, parseNumberish(qaSignals[id][0]())])),
  }))

  const podLevels = createMemo(() =>
    KAIPER_DATA.genesisPod.reduce((sum, pod) => sum + (levels()[levelKey.pod(pod.particle)] ?? 0), 0),
  )

  const autoExponent = createMemo(
    () =>
      kappaExponentFromRules(KAPPA_EXPONENT_RULES, {
        researchLevel: parseNumberish(researchLevel()),
        dcmLevel: parseNumberish(dcmLevel()),
        playerLevel: parseNumberish(playerLevel()),
        ogLevels: techLevels(),
        crystals: { "bundle.meltdown": meltdownBundle() },
      }) +
      podLevels() * GENESIS_POD_EXPONENT,
  )
  const totalExponent = createMemo(
    () => Math.max(0, parseNumberish(baseExponent())) + Math.max(0, parseNumberish(extraExponent())) + autoExponent(),
  )

  const premiumMultiplier = createMemo(() =>
    calculateTotalPremiumMultiplier(
      {
        "Kappa Output": parseNumberish(kappaOutput()),
        "Kappa Bundle": kappaBundle(),
        "Juno Kappa Bundle": junoKappaBundle(),
        tokens: parseNumberish(kappaTokens()),
      },
      KAPPA_PREMIUM_RULES,
    ),
  )

  const exponentGains = createMemo(() =>
    calculateExponentIncreaseMultipliers(
      kappa.gainPerSecond(),
      Math.max(totalExponent(), 0.001),
      premiumMultiplier(),
      EXPONENT_DELTAS,
    ),
  )

  const rows = createMemo(() =>
    buildKaiperRows({
      data: KAIPER_DATA,
      se: seNumber(),
      reducers: reducers(),
      sequencingBundle: sequencingBundle(),
      levels: levels(),
    }),
  )

  const resourceInputs = (resource: string) => {
    if (resource === "cash") return cash
    return particleInputs[resource as UnlockedParticle] ?? kappa
  }

  const costOf = (row: KaiperRow): LargeNumber | null => (row.costLog10 === null ? null : fromLog10(row.costLog10))

  const etaSeconds = (row: KaiperRow) => {
    const cost = costOf(row)
    if (!cost) return Number.POSITIVE_INFINITY
    const inputs = resourceInputs(row.resource)
    return estimateSeconds(cost, inputs.currentAmount(), inputs.gainPerSecond())
  }

  const upcoming = createMemo<UpcomingRow[]>(() => {
    const { ampRows, particleRows, otherRows } = rows()
    return [...ampRows, ...particleRows, ...otherRows]
      .filter((row) => !row.locked && row.costLog10 !== null)
      .map((row) => ({ ...row, etaSeconds: etaSeconds(row) }))
      .sort((a, b) => a.etaSeconds - b.etaSeconds)
  })

  return {
    se,
    setSe,
    researchLevel,
    setResearchLevel,
    dcmLevel,
    setDcmLevel,
    baseExponent,
    setBaseExponent,
    extraExponent,
    setExtraExponent,
    qaSignals,
    meltdownBundle,
    setMeltdownBundle,
    sequencingBundle,
    setSequencingBundle,
    kappa,
    cash,
    particleInputs,
    levels,
    setLevel,
    autoExponent,
    totalExponent,
    premiumMultiplier,
    exponentGains,
    rows,
    upcoming,
    costOf,
    etaSeconds,
  }
}

type KaiperContextValue = ReturnType<typeof createKaiperContext>

const KaiperContext = createContext<KaiperContextValue>()

export const KaiperProvider = (props: ParentProps) => (
  <KaiperContext.Provider value={createKaiperContext()}>{props.children}</KaiperContext.Provider>
)

export const useKaiperContext = () => {
  const context = useContext(KaiperContext)
  if (!context) throw new Error("useKaiperContext must be used inside KaiperProvider")
  return context
}
