import { createMemo, For, Show } from "solid-js"
import { Panel } from "../components/layout/Panel"
import { ToggleField } from "../components/ui/formControls"
import { isValidNumberishInput } from "../components/ui/formControls"
import { sanitizeNumberishInput } from "../components/ui/formControls"
import { Tooltip } from "../components/ui/Tooltip"
import { createPersistedSignal } from "../lib/persistedSignal.js"
import { useZatData, type PremiumCrystalTokenMethod, type PremiumHaulerLayer } from "../lib/zatContext.jsx"

type HaulerToggleKey =
  | "layer1TokenIncome"
  | "layer1CrystalIncome"
  | "layer3CrystalIncome"
  | "layer4RareDirtIncome"
  | "layer7RareDirtIncome"
  | "layer2ExoticIncome"
  | "layer6ExoticIncome"
  | "layer9ExoticIncome"

const seItemOptions = [11, 81, 101, 133, 158]

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

function parseNumberish(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function formatValue(value: number, digits = 2): string {
  return value.toFixed(digits)
}

function NumberSelectField(props: {
  id: string
  label: string
  value: string
  onInput: (next: string) => void
  options: number[]
  min: number
  max: number
  step?: number
  tooltip?: string
}) {
  const listId = `premium-${props.id}-list`

  return (
    <div class="grid gap-1.5">
      <div class="flex items-center gap-2">
        <label for={props.id} class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75">
          {props.label}
        </label>
        {props.tooltip ? <Tooltip content={props.tooltip} /> : null}
      </div>
      <input
        id={props.id}
        list={listId}
        type="text"
        inputMode="decimal"
        value={props.value}
        onInput={(event) => {
          const next = sanitizeNumberishInput(event.currentTarget.value)
          if (!isValidNumberishInput(next)) return
          props.onInput(next)
        }}
        class="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring"
      />
      <datalist id={listId}>
        <For each={props.options}>{(option) => <option value={option} />}</For>
      </datalist>
    </div>
  )
}

function CrystalAndTokenTab() {
  const data = useZatData()
  const premium = data().premium.crystalToken
  const [tokenBooster, setTokenBooster] = createPersistedSignal("premium.tokenBooster", "0")

  const [supplyBotTokenUpgrade, setSupplyBotTokenUpgrade] = createPersistedSignal("premium.supplyBotTokenUpgrade", "0")
  const [supplyBotCrystalUpgrade, setSupplyBotCrystalUpgrade] = createPersistedSignal(
    "premium.supplyBotCrystalUpgrade",
    "0",
  )
  const [bbDurationUpgrade, setBbDurationUpgrade] = createPersistedSignal("premium.bbDurationUpgrade", "0")
  const [bbTokenUpgrade, setBbTokenUpgrade] = createPersistedSignal("premium.bbTokenUpgrade", "0")
  const [chestEnhancer, setChestEnhancer] = createPersistedSignal("premium.chestEnhancer", "0")
  const [averageHoursPerDay, setAverageHoursPerDay] = createPersistedSignal("premium.averageHoursPerDay", "24")
  const [includeDailyRewards, setIncludeDailyRewards] = createPersistedSignal("premium.includeDailyRewards", false)
  const [seItem, setSeItem] = createPersistedSignal("premium.seItem", "11")
  const [luckyLeafClover, setLuckyLeafClover] = createPersistedSignal("premium.luckyLeafClover", false)

  const normalizedTokenBooster = createMemo(() => clamp(parseNumberish(tokenBooster()), 0, 100))
  const normalizedSupplyBotToken = createMemo(() => clamp(parseNumberish(supplyBotTokenUpgrade()), 0, 25))
  const normalizedSupplyBotCrystal = createMemo(() => clamp(parseNumberish(supplyBotCrystalUpgrade()), 0, 8))
  const normalizedBbDuration = createMemo(() => clamp(parseNumberish(bbDurationUpgrade()), 0, 40))
  const normalizedBbToken = createMemo(() => clamp(parseNumberish(bbTokenUpgrade()), 0, 20))
  const normalizedChestEnhancer = createMemo(() => clamp(parseNumberish(chestEnhancer()), 0, 10))
  const normalizedAverageHours = createMemo(() => clamp(parseNumberish(averageHoursPerDay()), 0, 24))
  const selectedSe = createMemo(() => {
    const value = Math.floor(parseNumberish(seItem()))
    return seItemOptions.includes(value) ? value : 11
  })

  const tokenBoosterMultiplier = createMemo(() => 1 + normalizedTokenBooster() * 0.01)
  const chestEnhancerMultiplier = createMemo(() => 1 + normalizedChestEnhancer() * 0.1)

  const seMultiplier = createMemo(() => {
    const selected = selectedSe()
    const rule = premium.seDailyTokenMultipliers.find((entry: { se: number; mult: number }) => entry.se === selected)
    return rule?.mult ?? 1
  })

  const rows = createMemo(() => {
    return premium.methods.map((method: PremiumCrystalTokenMethod) => {
      const luckyFactor = method.luckyLeafClover && luckyLeafClover() ? 0.9 : 1
      const seconds = method.seconds * luckyFactor

      let tokens = method.tokens
      let crystals = method.crystals

      if (method.chestEnhancer) {
        tokens *= chestEnhancerMultiplier()
      }

      if (method.id === "supply_bot") {
        tokens += normalizedSupplyBotToken() * (method.tokenUpgradePerLevel ?? 0)
        crystals += normalizedSupplyBotCrystal() * (method.crystalUpgradePerLevel ?? 0)
      }

      if (method.id === "bb_bot") {
        tokens += normalizedBbDuration() * (method.durationTokenPerLevel ?? 0)
        if (normalizedBbDuration() >= (method.tokenUpgradeUnlockLevel ?? 40)) {
          tokens += normalizedBbToken() * (method.tokenUpgradePerLevel ?? 0)
        }
      }

      if (method.tokenBooster) {
        tokens *= tokenBoosterMultiplier()
      }

      const perHourFactor = 3600 / Math.max(seconds, 1)
      const hourlyTokens = tokens * perHourFactor
      const hourlyCrystals = crystals * perHourFactor
      const dailyTokens = hourlyTokens * normalizedAverageHours()
      const dailyCrystals = hourlyCrystals * normalizedAverageHours()

      return {
        name: method.name,
        seconds,
        perHourFactor,
        baseTokens: tokens,
        baseCrystals: crystals,
        hourlyTokens,
        hourlyCrystals,
        dailyTokens,
        dailyCrystals,
      }
    })
  })

  const dailyRewardRow = createMemo(() => {
    if (!includeDailyRewards()) {
      return {
        hourlyTokens: 0,
        hourlyCrystals: 0,
        dailyTokens: 0,
        dailyCrystals: 0,
      }
    }

    const dailyTokens = premium.dailyRewards.tokens * tokenBoosterMultiplier() * seMultiplier()
    const dailyCrystals = premium.dailyRewards.crystals

    return {
      hourlyTokens: dailyTokens / 24,
      hourlyCrystals: dailyCrystals / 24,
      dailyTokens,
      dailyCrystals,
    }
  })

  const totals = createMemo(() => {
    const base = rows().reduce(
      (sum: { hourlyTokens: number; hourlyCrystals: number; dailyTokens: number; dailyCrystals: number }, row) => {
        return {
          hourlyTokens: sum.hourlyTokens + row.hourlyTokens,
          hourlyCrystals: sum.hourlyCrystals + row.hourlyCrystals,
          dailyTokens: sum.dailyTokens + row.dailyTokens,
          dailyCrystals: sum.dailyCrystals + row.dailyCrystals,
        }
      },
      { hourlyTokens: 0, hourlyCrystals: 0, dailyTokens: 0, dailyCrystals: 0 },
    )

    return {
      hourlyTokens: base.hourlyTokens + dailyRewardRow().hourlyTokens,
      hourlyCrystals: base.hourlyCrystals + dailyRewardRow().hourlyCrystals,
      dailyTokens: base.dailyTokens + dailyRewardRow().dailyTokens,
      dailyCrystals: base.dailyCrystals + dailyRewardRow().dailyCrystals,
    }
  })

  return (
    <div class="grid gap-6 xl:grid-cols-[0.96fr_1.34fr]">
      <section class="space-y-4">
        <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
          <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">Inputs</h3>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberSelectField
              id="supply-bot-token"
              label="Supply Bot Token Upgrade"
              value={supplyBotTokenUpgrade()}
              onInput={setSupplyBotTokenUpgrade}
              options={[0, 5, 10, 15, 20, 25]}
              min={0}
              max={25}
              tooltip="In the Token Shop under Supplies Upgrades. Gives +0.1 token per level."
            />
            <NumberSelectField
              id="supply-bot-crystal"
              label="Supply Bot Crystal Upgrade"
              value={supplyBotCrystalUpgrade()}
              onInput={setSupplyBotCrystalUpgrade}
              options={[0, 2, 4, 6, 8]}
              min={0}
              max={8}
              tooltip="In the Token Shop under Supplies Upgrades. Gives +1 crystal per level."
            />
            <NumberSelectField
              id="bb-duration"
              label="BB-Bot Total Duration Upgrade"
              value={bbDurationUpgrade()}
              onInput={setBbDurationUpgrade}
              options={[0, 10, 20, 30, 40]}
              min={0}
              max={40}
              tooltip="In the Token Shop under BB-Bot Upgrades. Adds 60 seconds and +0.05 tokens per level."
            />
            <NumberSelectField
              id="bb-token"
              label="BB-Bot Token Upgrade"
              value={bbTokenUpgrade()}
              onInput={setBbTokenUpgrade}
              options={[0, 5, 10, 15, 20]}
              min={0}
              max={20}
              tooltip="In the Token Shop under BB-Bot Upgrades. Requires BB-Bot Duration level 40 and adds 0.5 tokens per level."
            />
            <NumberSelectField
              id="token-booster"
              label="Token Booster"
              value={tokenBooster()}
              onInput={setTokenBooster}
              options={[0, 10, 25, 50, 75, 100]}
              min={0}
              max={100}
              tooltip="In the Crystal Shop special upgrades tab. Adds 1% token gain per level to all token sources."
            />
            <NumberSelectField
              id="chest-enhancer"
              label="Module #17: Chest Enhancer"
              value={chestEnhancer()}
              onInput={setChestEnhancer}
              options={[0, 2, 4, 6, 8, 10]}
              min={0}
              max={10}
              tooltip="In the Gamma Corporation module collection. Gives +10% chest tokens per level."
            />
            <NumberSelectField
              id="hours-per-day"
              label="Average hours per day"
              value={averageHoursPerDay()}
              onInput={setAverageHoursPerDay}
              options={[4, 8, 12, 16, 20, 24]}
              min={0}
              max={24}
              step={0.25}
              tooltip="How many hours per day you actively collect with optimal timing."
            />
            <NumberSelectField
              id="se-item"
              label="SE item"
              value={String(selectedSe())}
              onInput={setSeItem}
              options={seItemOptions}
              min={11}
              max={158}
              tooltip="Selected SE threshold for daily token reward multiplier."
            />
          </div>
          <div class="mt-3 space-y-2">
            <ToggleField
              label="Total includes daily rewards"
              checked={includeDailyRewards()}
              onChange={setIncludeDailyRewards}
              tooltip="Adds 100 crystals and 34.375 tokens daily, then applies token booster and selected SE multiplier to the token part."
            />
            <ToggleField
              label="Lucky Leaf Clover perk (L4)"
              checked={luckyLeafClover()}
              onChange={setLuckyLeafClover}
              tooltip="Reduces chest cooldown by 10% for Basic and Rare chest cycles."
            />
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-ink/15 bg-white/75 p-4 sm:p-5">
        <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">Premium Methods</h3>
        <div class="mt-3 overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr class="text-xs uppercase tracking-[0.12em] text-ink/60">
                <th class="border-b border-ink/20 px-2 py-2">Method</th>
                <th class="border-b border-ink/20 px-2 py-2">Time</th>
                <th class="border-b border-ink/20 px-2 py-2">Base Output</th>
                <th class="border-b border-ink/20 px-2 py-2">Hourly Output</th>
                <th class="border-b border-ink/20 px-2 py-2">Daily Output</th>
              </tr>
            </thead>
            <tbody>
              <For each={rows()}>
                {(row) => (
                  <tr class="align-top text-ink/90">
                    <td class="border-b border-ink/10 px-2 py-2.5 font-semibold">{row.name}</td>
                    <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">
                      {formatValue(row.seconds, 1)}s<br />
                      {formatValue(row.perHourFactor, 2)} per hour
                    </td>
                    <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">
                      T {formatValue(row.baseTokens)}
                      <br />C {formatValue(row.baseCrystals)}
                    </td>
                    <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">
                      T {formatValue(row.hourlyTokens)}
                      <br />C {formatValue(row.hourlyCrystals)}
                    </td>
                    <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">
                      T {formatValue(row.dailyTokens)}
                      <br />C {formatValue(row.dailyCrystals)}
                    </td>
                  </tr>
                )}
              </For>
              <Show when={includeDailyRewards()}>
                <tr class="align-top text-ink/90">
                  <td class="border-b border-ink/10 px-2 py-2.5 font-semibold">Daily Rewards</td>
                  <td class="border-b border-ink/10 px-2 py-2.5 text-xs text-ink/65">Flat daily grant</td>
                  <td class="border-b border-ink/10 px-2 py-2.5 text-xs text-ink/65">Included in totals</td>
                  <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">
                    T {formatValue(dailyRewardRow().hourlyTokens)}
                    <br />C {formatValue(dailyRewardRow().hourlyCrystals)}
                  </td>
                  <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">
                    T {formatValue(dailyRewardRow().dailyTokens)}
                    <br />C {formatValue(dailyRewardRow().dailyCrystals)}
                  </td>
                </tr>
              </Show>
              <tr class="align-top font-semibold text-ink">
                <td class="px-2 py-3">Total</td>
                <td class="px-2 py-3 text-xs text-ink/65">Across all methods</td>
                <td class="px-2 py-3 text-xs text-ink/65">-</td>
                <td class="px-2 py-3 font-mono text-xs">
                  T {formatValue(totals().hourlyTokens)}
                  <br />C {formatValue(totals().hourlyCrystals)}
                </td>
                <td class="px-2 py-3 font-mono text-xs">
                  T {formatValue(totals().dailyTokens)}
                  <br />C {formatValue(totals().dailyCrystals)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function HaulerMineTab() {
  const data = useZatData()
  const premium = data().premium.haulerMine
  const [tokenBooster, setTokenBooster] = createPersistedSignal("premium.tokenBooster", "0")

  const [unlockedLayers, setUnlockedLayers] = createPersistedSignal("premium.hauler.unlockedLayers", "11")
  const [layer1TokenIncome, setLayer1TokenIncome] = createPersistedSignal("premium.hauler.layer1TokenIncome", false)
  const [layer1CrystalIncome, setLayer1CrystalIncome] = createPersistedSignal(
    "premium.hauler.layer1CrystalIncome",
    false,
  )
  const [layer3CrystalIncome, setLayer3CrystalIncome] = createPersistedSignal(
    "premium.hauler.layer3CrystalIncome",
    false,
  )
  const [layer4RareDirtIncome, setLayer4RareDirtIncome] = createPersistedSignal(
    "premium.hauler.layer4RareDirtIncome",
    false,
  )
  const [layer7RareDirtIncome, setLayer7RareDirtIncome] = createPersistedSignal(
    "premium.hauler.layer7RareDirtIncome",
    false,
  )
  const [layer2ExoticIncome, setLayer2ExoticIncome] = createPersistedSignal("premium.hauler.layer2ExoticIncome", false)
  const [layer6ExoticIncome, setLayer6ExoticIncome] = createPersistedSignal("premium.hauler.layer6ExoticIncome", false)
  const [layer9ExoticIncome, setLayer9ExoticIncome] = createPersistedSignal("premium.hauler.layer9ExoticIncome", false)

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
      <section class="space-y-4">
        <div class="rounded-2xl border border-ink/15 bg-white/70 p-4">
          <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">Inputs</h3>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberSelectField
              id="hauler-unlocked-layers"
              label="Unlocked layers"
              value={unlockedLayers()}
              onInput={setUnlockedLayers}
              options={[0, 2, 4, 6, 8, 10, 11]}
              min={0}
              max={11}
              tooltip="Highest unlocked layer in the hauler mine route."
            />
            <NumberSelectField
              id="hauler-token-booster"
              label="Token Booster"
              value={tokenBooster()}
              onInput={setTokenBooster}
              options={[0, 10, 25, 50, 75, 100]}
              min={0}
              max={100}
              tooltip="Shared with Crystal and Token tab. Applies to all hauler token rewards."
            />
          </div>

          <div class="mt-3 space-y-2">
            <For each={toggleLabels}>
              {(entry) => (
                <ToggleField label={entry.label} checked={toggleMap()[entry.key]} onChange={setToggleMap[entry.key]} />
              )}
            </For>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-ink/15 bg-white/75 p-4 sm:p-5">
        <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80">Hauler Mine Income</h3>
        <p class="mt-1 text-xs text-ink/65">
          Cycle time uses {(normalizedLayers() + 1).toFixed(0)} layers at {premium.layerHours} hours each.
        </p>

        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr class="text-xs uppercase tracking-[0.12em] text-ink/60">
                <th class="border-b border-ink/20 px-2 py-2">Resource</th>
                <th class="border-b border-ink/20 px-2 py-2">Per Cycle</th>
                <th class="border-b border-ink/20 px-2 py-2">Per Hour</th>
                <th class="border-b border-ink/20 px-2 py-2">Per Day</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border-b border-ink/10 px-2 py-2.5 font-semibold">Tokens</td>
                <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">
                  {formatValue(totalsPerCycle().tokens)}
                </td>
                <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">{formatValue(hourly().tokens)}</td>
                <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">{formatValue(daily().tokens)}</td>
              </tr>
              <tr>
                <td class="border-b border-ink/10 px-2 py-2.5 font-semibold">Crystals</td>
                <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">
                  {formatValue(totalsPerCycle().crystals)}
                </td>
                <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">{formatValue(hourly().crystals)}</td>
                <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">{formatValue(daily().crystals)}</td>
              </tr>
              <tr>
                <td class="border-b border-ink/10 px-2 py-2.5 font-semibold">Rare Dirt</td>
                <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">
                  {formatValue(totalsPerCycle().rareDirt)}
                </td>
                <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">{formatValue(hourly().rareDirt)}</td>
                <td class="border-b border-ink/10 px-2 py-2.5 font-mono text-xs">{formatValue(daily().rareDirt)}</td>
              </tr>
              <tr>
                <td class="px-2 py-3 font-semibold">Exotic Dirt</td>
                <td class="px-2 py-3 font-mono text-xs">{formatValue(totalsPerCycle().exoticDirt)}</td>
                <td class="px-2 py-3 font-mono text-xs">{formatValue(hourly().exoticDirt)}</td>
                <td class="px-2 py-3 font-mono text-xs">{formatValue(daily().exoticDirt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export function PremiumCrystalTokenPage() {
  return (
    <Panel title="Premium Crystal and Token" subtitle="Chest and bot output with premium upgrades.">
      <CrystalAndTokenTab />
    </Panel>
  )
}

export function PremiumHaulerMinePage() {
  return (
    <Panel title="Premium Hauler Mine" subtitle="Layer income by time with premium toggles.">
      <HaulerMineTab />
    </Panel>
  )
}
