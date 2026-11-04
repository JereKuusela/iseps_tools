import { createMemo, For, Show } from "solid-js"
import { Panel } from "../../components/layout/Panel"
import { Tooltip } from "../../components/ui/Tooltip"
import { INPUT_BASE_CLASS } from "../../components/ui/inputStyles"
import { clamp } from "../../lib/mathUtils"
import { formatFixed as formatValue } from "../../lib/numberFormat"
import { parseNumberish } from "../../lib/parseNumber"
import { createSyncedSignal } from "../../lib/persistedSignal"
import { getCrystalKey } from "../../shared/crystalSharedInputs"
import { TOKEN_SHARED_KEYS } from "../../shared/tokenSharedInputs"
import type { TooltipKey } from "../../lib/tooltips"
import { useZatData, type PremiumCrystalTokenMethod, type PremiumHaulerLayer } from "../../shared/zatContext"
import { CheckboxField } from "../../components/ui/formControls"
import { PremiumNumberSelectField as NumberSelectField } from "./PremiumNumberSelectField"
import { premiumStyles as styles } from "./premiumStyles"

type HaulerToggleKey =
  | "layer1TokenIncome"
  | "layer1CrystalIncome"
  | "layer3CrystalIncome"
  | "layer4RareDirtIncome"
  | "layer7RareDirtIncome"
  | "layer2ExoticIncome"
  | "layer6ExoticIncome"
  | "layer9ExoticIncome"

const toggleLabels: { key: HaulerToggleKey; label: string }[] = [
  { key: "layer1TokenIncome", label: "Layer 1 #3 token income" },
  { key: "layer1CrystalIncome", label: "Layer 1 #2 crystal income" },
  { key: "layer3CrystalIncome", label: "Layer 3 #3 crystal income" },
  { key: "layer4RareDirtIncome", label: "Layer 4 #2 rare dirt income" },
  { key: "layer7RareDirtIncome", label: "Layer 7 #2 rare dirt income" },
  { key: "layer2ExoticIncome", label: "Layer 2 #3 exotic dirt income" },
  { key: "layer6ExoticIncome", label: "Layer 6 #2 exotic dirt income" },
  { key: "layer9ExoticIncome", label: "Layer 9 #2 exotic dirt income" },
]

const HaulerMineTab = () => {
  const data = useZatData()
  const premium = data().premium.haulerMine
  const [tokenBooster, setTokenBooster] = createSyncedSignal(getCrystalKey("special.tokenBooster"), "0")

  const [unlockedLayers, setUnlockedLayers] = createSyncedSignal("premium.hauler.unlockedLayers", "11")
  const [layer1TokenIncome, setLayer1TokenIncome] = createSyncedSignal("premium.hauler.layer1TokenIncome", false)
  const [layer1CrystalIncome, setLayer1CrystalIncome] = createSyncedSignal("premium.hauler.layer1CrystalIncome", false)
  const [layer3CrystalIncome, setLayer3CrystalIncome] = createSyncedSignal("premium.hauler.layer3CrystalIncome", false)
  const [layer4RareDirtIncome, setLayer4RareDirtIncome] = createSyncedSignal(
    "premium.hauler.layer4RareDirtIncome",
    false,
  )
  const [layer7RareDirtIncome, setLayer7RareDirtIncome] = createSyncedSignal(
    "premium.hauler.layer7RareDirtIncome",
    false,
  )
  const [layer2ExoticIncome, setLayer2ExoticIncome] = createSyncedSignal("premium.hauler.layer2ExoticIncome", false)
  const [layer6ExoticIncome, setLayer6ExoticIncome] = createSyncedSignal("premium.hauler.layer6ExoticIncome", false)
  const [layer9ExoticIncome, setLayer9ExoticIncome] = createSyncedSignal("premium.hauler.layer9ExoticIncome", false)

  const toggleMap = createMemo<Record<HaulerToggleKey, boolean>>(() => ({
    layer1TokenIncome: layer1TokenIncome(),
    layer1CrystalIncome: layer1CrystalIncome(),
    layer3CrystalIncome: layer3CrystalIncome(),
    layer4RareDirtIncome: layer4RareDirtIncome(),
    layer7RareDirtIncome: layer7RareDirtIncome(),
    layer2ExoticIncome: layer2ExoticIncome(),
    layer6ExoticIncome: layer6ExoticIncome(),
    layer9ExoticIncome: layer9ExoticIncome(),
  }))

  const setToggleMap: Record<HaulerToggleKey, (next: boolean) => void> = {
    layer1TokenIncome: setLayer1TokenIncome,
    layer1CrystalIncome: setLayer1CrystalIncome,
    layer3CrystalIncome: setLayer3CrystalIncome,
    layer4RareDirtIncome: setLayer4RareDirtIncome,
    layer7RareDirtIncome: setLayer7RareDirtIncome,
    layer2ExoticIncome: setLayer2ExoticIncome,
    layer6ExoticIncome: setLayer6ExoticIncome,
    layer9ExoticIncome: setLayer9ExoticIncome,
  }

  const normalizedLayers = createMemo(() => clamp(Math.floor(parseNumberish(unlockedLayers())), 0, 11))
  const tokenBoosterMultiplier = createMemo(() => 1 + clamp(parseNumberish(tokenBooster()), 0, 100) * 0.01)

  const totalsPerCycle = createMemo(() => {
    return premium.layers
      .filter((layer: PremiumHaulerLayer) => layer.layer <= normalizedLayers())
      .reduce(
        (
          sum: { tokens: number; crystals: number; rareDirt: number; exoticDirt: number },
          layer: PremiumHaulerLayer,
        ) => {
          const tokenAllowed = !layer.tokenToggle || toggleMap()[layer.tokenToggle as HaulerToggleKey]
          const crystalAllowed = !layer.crystalToggle || toggleMap()[layer.crystalToggle as HaulerToggleKey]
          const exoticAllowed = !layer.exoticToggle || toggleMap()[layer.exoticToggle as HaulerToggleKey]
          const rareBonusAllowed = !layer.rareBonusToggle || toggleMap()[layer.rareBonusToggle as HaulerToggleKey]

          const tokens = tokenAllowed ? (layer.tokens ?? 0) * tokenBoosterMultiplier() : 0
          const crystals = crystalAllowed ? (layer.crystals ?? 0) : 0
          const exotic = exoticAllowed ? (layer.exoticDirt ?? 0) : 0
          const rare = (layer.rareDirt ?? 0) + (rareBonusAllowed ? (layer.rareDirtBonus ?? 0) : 0)

          return {
            tokens: sum.tokens + tokens,
            crystals: sum.crystals + crystals,
            rareDirt: sum.rareDirt + rare,
            exoticDirt: sum.exoticDirt + exotic,
          }
        },
        { tokens: 0, crystals: 0, rareDirt: 0, exoticDirt: 0 },
      )
  })

  const hourly = createMemo(() => {
    const cycleHours = Math.max(1, premium.layerHours * (normalizedLayers() + 1))
    return {
      tokens: totalsPerCycle().tokens / cycleHours,
      crystals: totalsPerCycle().crystals / cycleHours,
      rareDirt: totalsPerCycle().rareDirt / cycleHours,
      exoticDirt: totalsPerCycle().exoticDirt / cycleHours,
    }
  })

  const daily = createMemo(() => ({
    tokens: hourly().tokens * 24,
    crystals: hourly().crystals * 24,
    rareDirt: hourly().rareDirt * 24,
    exoticDirt: hourly().exoticDirt * 24,
  }))

  return (
    <div class="grid gap-6 xl:grid-cols-[0.96fr_1.34fr]">
      <section class={styles.inputSection}>
        <div class={styles.inputCard}>
          <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Inputs</h3>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberSelectField
              id="hauler-unlocked-layers"
              label="Unlocked layers"
              value={unlockedLayers()}
              onInput={setUnlockedLayers}
              options={[0, 2, 4, 6, 8, 10, 11]}
              min={0}
              max={11}
              tooltip="premium.unlockedLayers"
            />
            <NumberSelectField
              id="hauler-token-booster"
              label="Token Booster"
              value={tokenBooster()}
              onInput={setTokenBooster}
              options={[0, 10, 25, 50, 75, 100]}
              min={0}
              max={100}
              tooltip="premium.haulerTokenBooster"
            />
          </div>

          <div class="mt-3 space-y-2">
            <For each={toggleLabels}>
              {(entry) => (
                <CheckboxField
                  label={entry.label}
                  checked={toggleMap()[entry.key]}
                  onChange={setToggleMap[entry.key]}
                />
              )}
            </For>
          </div>
        </div>
      </section>

      <section class={styles.outputCard}>
        <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Hauler Mine Income</h3>
        <p class="mt-1 text-xs text-ink/65 dark:text-white/65">
          Cycle time uses {(normalizedLayers() + 1).toFixed(0)} layers at {premium.layerHours} hours each.
        </p>

        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr class="text-xs uppercase tracking-[0.12em] text-ink/60 dark:text-white/60">
                <th class={styles.tableHeadCell}>Resource</th>
                <th class={styles.tableHeadCell}>Per Cycle</th>
                <th class={styles.tableHeadCell}>Per Hour</th>
                <th class={styles.tableHeadCell}>Per Day</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class={styles.haulerCellStrong}>Tokens</td>
                <td class={styles.haulerCellMono}>{formatValue(totalsPerCycle().tokens)}</td>
                <td class={styles.haulerCellMono}>{formatValue(hourly().tokens)}</td>
                <td class={styles.haulerCellMono}>{formatValue(daily().tokens)}</td>
              </tr>
              <tr>
                <td class={styles.haulerCellStrong}>Crystals</td>
                <td class={styles.haulerCellMono}>{formatValue(totalsPerCycle().crystals)}</td>
                <td class={styles.haulerCellMono}>{formatValue(hourly().crystals)}</td>
                <td class={styles.haulerCellMono}>{formatValue(daily().crystals)}</td>
              </tr>
              <tr>
                <td class={styles.haulerCellStrong}>Rare Dirt</td>
                <td class={styles.haulerCellMono}>{formatValue(totalsPerCycle().rareDirt)}</td>
                <td class={styles.haulerCellMono}>{formatValue(hourly().rareDirt)}</td>
                <td class={styles.haulerCellMono}>{formatValue(daily().rareDirt)}</td>
              </tr>
              <tr>
                <td class="px-2 py-3 font-semibold dark:text-white">Exotic Dirt</td>
                <td class="px-2 py-3 font-mono text-xs dark:text-white/90">
                  {formatValue(totalsPerCycle().exoticDirt)}
                </td>
                <td class="px-2 py-3 font-mono text-xs dark:text-white/90">{formatValue(hourly().exoticDirt)}</td>
                <td class="px-2 py-3 font-mono text-xs dark:text-white/90">{formatValue(daily().exoticDirt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export const PremiumHaulerMinePage = () => {
  return (
    <Panel title="Premium Hauler Mine" tooltip="premium.panelHaulerMine">
      <HaulerMineTab />
    </Panel>
  )
}
