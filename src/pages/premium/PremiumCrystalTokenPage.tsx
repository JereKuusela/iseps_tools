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

const seItemOptions = [11, 81, 101, 133, 158]

const CrystalAndTokenTab = () => {
  const data = useZatData()
  const premium = data().premium.crystalToken
  const [tokenBooster, setTokenBooster] = createSyncedSignal(getCrystalKey("special.tokenBooster"), "0")

  const [supplyBotTokenUpgrade, setSupplyBotTokenUpgrade] = createSyncedSignal("premium.supplyBotTokenUpgrade", "0")
  const [supplyBotCrystalUpgrade, setSupplyBotCrystalUpgrade] = createSyncedSignal(
    "premium.supplyBotCrystalUpgrade",
    "0",
  )
  const [bbDurationUpgrade, setBbDurationUpgrade] = createSyncedSignal("premium.bbDurationUpgrade", "0")
  const [bbTokenUpgrade, setBbTokenUpgrade] = createSyncedSignal("premium.bbTokenUpgrade", "0")
  const [chestEnhancer, setChestEnhancer] = createSyncedSignal("premium.chestEnhancer", "0")
  const [averageHoursPerDay, setAverageHoursPerDay] = createSyncedSignal(TOKEN_SHARED_KEYS.onlineHoursPerDay, "10")
  const [includeDailyRewards, setIncludeDailyRewards] = createSyncedSignal("premium.includeDailyRewards", false)
  const [seItem, setSeItem] = createSyncedSignal("premium.seItem", "11")
  const [luckyLeafClover, setLuckyLeafClover] = createSyncedSignal("premium.luckyLeafClover", false)

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
      <section class={styles.inputSection}>
        <div class={styles.inputCard}>
          <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Inputs</h3>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberSelectField
              id="supply-bot-token"
              label="Supply Bot Token Upgrade"
              value={supplyBotTokenUpgrade()}
              onInput={setSupplyBotTokenUpgrade}
              options={[0, 5, 10, 15, 20, 25]}
              min={0}
              max={25}
              tooltip="premium.supplyBotTokenUpgrade"
            />
            <NumberSelectField
              id="supply-bot-crystal"
              label="Supply Bot Crystal Upgrade"
              value={supplyBotCrystalUpgrade()}
              onInput={setSupplyBotCrystalUpgrade}
              options={[0, 2, 4, 6, 8]}
              min={0}
              max={8}
              tooltip="premium.supplyBotCrystalUpgrade"
            />
            <NumberSelectField
              id="bb-duration"
              label="BB-Bot Total Duration Upgrade"
              value={bbDurationUpgrade()}
              onInput={setBbDurationUpgrade}
              options={[0, 10, 20, 30, 40]}
              min={0}
              max={40}
              tooltip="premium.bbDurationUpgrade"
            />
            <NumberSelectField
              id="bb-token"
              label="BB-Bot Token Upgrade"
              value={bbTokenUpgrade()}
              onInput={setBbTokenUpgrade}
              options={[0, 5, 10, 15, 20]}
              min={0}
              max={20}
              tooltip="premium.bbTokenUpgrade"
            />
            <NumberSelectField
              id="token-booster"
              label="Token Booster"
              value={tokenBooster()}
              onInput={setTokenBooster}
              options={[0, 10, 25, 50, 75, 100]}
              min={0}
              max={100}
              tooltip="premium.tokenBooster"
            />
            <NumberSelectField
              id="chest-enhancer"
              label="Module #17: Chest Enhancer"
              value={chestEnhancer()}
              onInput={setChestEnhancer}
              options={[0, 2, 4, 6, 8, 10]}
              min={0}
              max={10}
              tooltip="premium.chestEnhancer"
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
              tooltip="premium.averageHoursPerDay"
            />
            <NumberSelectField
              id="se-item"
              label="SE item"
              value={String(selectedSe())}
              onInput={setSeItem}
              options={seItemOptions}
              min={11}
              max={158}
              tooltip="premium.seItem"
            />
          </div>
          <div class="mt-3 space-y-2">
            <CheckboxField
              label="Total includes daily rewards"
              checked={includeDailyRewards()}
              onChange={setIncludeDailyRewards}
              tooltip="premium.includeDailyRewards"
            />
            <CheckboxField
              label="Lucky Leaf Clover perk (L4)"
              checked={luckyLeafClover()}
              onChange={setLuckyLeafClover}
              tooltip="premium.luckyLeafClover"
            />
          </div>
        </div>
      </section>

      <section class={styles.outputCard}>
        <h3 class="text-sm font-bold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Premium Methods</h3>
        <div class="mt-3 overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr class="text-xs uppercase tracking-[0.12em] text-ink/60 dark:text-white/60">
                <th class={styles.tableHeadCell}>Method</th>
                <th class={styles.tableHeadCell}>Time</th>
                <th class={styles.tableHeadCell}>Base Output</th>
                <th class={styles.tableHeadCell}>Hourly Output</th>
                <th class={styles.tableHeadCell}>Daily Output</th>
              </tr>
            </thead>
            <tbody>
              <For each={rows()}>
                {(row) => (
                  <tr class={styles.tableTextRow}>
                    <td class={styles.tableCellStrong}>{row.name}</td>
                    <td class={styles.tableCellMono}>
                      {formatValue(row.seconds, 1)}s<br />
                      {formatValue(row.perHourFactor, 2)} per hour
                    </td>
                    <td class={styles.tableCellMono}>
                      T {formatValue(row.baseTokens)}
                      <br />C {formatValue(row.baseCrystals)}
                    </td>
                    <td class={styles.tableCellMono}>
                      T {formatValue(row.hourlyTokens)}
                      <br />C {formatValue(row.hourlyCrystals)}
                    </td>
                    <td class={styles.tableCellMono}>
                      T {formatValue(row.dailyTokens)}
                      <br />C {formatValue(row.dailyCrystals)}
                    </td>
                  </tr>
                )}
              </For>
              <Show when={includeDailyRewards()}>
                <tr class={styles.tableTextRow}>
                  <td class={styles.tableCellStrong}>Daily Rewards</td>
                  <td class={styles.tableCellMuted}>Flat daily grant</td>
                  <td class={styles.tableCellMuted}>Included in totals</td>
                  <td class={styles.tableCellMono}>
                    T {formatValue(dailyRewardRow().hourlyTokens)}
                    <br />C {formatValue(dailyRewardRow().hourlyCrystals)}
                  </td>
                  <td class={styles.tableCellMono}>
                    T {formatValue(dailyRewardRow().dailyTokens)}
                    <br />C {formatValue(dailyRewardRow().dailyCrystals)}
                  </td>
                </tr>
              </Show>
              <tr class="align-top font-semibold text-ink dark:text-white">
                <td class="px-2 py-3">Total</td>
                <td class="px-2 py-3 text-xs text-ink/65 dark:text-white/65">Across all methods</td>
                <td class="px-2 py-3 text-xs text-ink/65 dark:text-white/65">-</td>
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

export const PremiumCrystalTokenPage = () => {
  return (
    <Panel title="Premium Crystal and Token" tooltip="premium.panelCrystalToken">
      <CrystalAndTokenTab />
    </Panel>
  )
}
