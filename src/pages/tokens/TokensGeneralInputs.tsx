import { For } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { IntegerField, ToggleField } from "../../components/ui/formControls"
import { PARTICLE_ORDER, useTokensContext, type UnlockedParticle } from "./tokensContext"

export const TokensGeneralInputs = () => {
  const tokens = useTokensContext()

  return (
    <InfoCard>
      <div class="grid gap-3">
        <div class="grid gap-2 sm:grid-cols-2">
          <IntegerField
            label="Hours/day"
            value={tokens.onlineHoursPerDay()}
            onInput={tokens.setOnlineHoursPerDay}
            min={0}
            max={24}
            step={1}
          />
          <IntegerField
            label="Granularity"
            value={tokens.granularity()}
            onInput={tokens.setGranularity}
            min={1}
            step={1}
          />
        </div>

        <div class="grid gap-1.5">
          <label class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">
            Unlocked particle
          </label>
          <select
            value={tokens.unlockedParticle()}
            onChange={(event) => tokens.setUnlockedParticle(event.currentTarget.value as UnlockedParticle)}
            class="w-full rounded-xl border border-ink/20 bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/15 dark:bg-[#1a2638] dark:text-white"
          >
            <For each={PARTICLE_ORDER}>
              {(id) => <option value={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</option>}
            </For>
          </select>
        </div>

        <div class="grid gap-2">
          <ToggleField
            label="Unlock Gamma Supplies and BB-Bot"
            checked={tokens.unlockGammaSuppliesBbBot()}
            onChange={tokens.setUnlockGammaSuppliesBbBot}
          />
          <ToggleField
            label="Unlock Helion Supplies and BB-Bot"
            checked={tokens.unlockHelionSuppliesBbBot()}
            onChange={tokens.setUnlockHelionSuppliesBbBot}
          />
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <IntegerField
            label="Supplies token"
            value={tokens.levels()["special.suppliesToken"] ?? "0"}
            onInput={(next) => tokens.setUpgradeLevel("special.suppliesToken", next)}
            min={0}
            step={1}
          />
          <IntegerField
            label="Supplies crystal"
            value={tokens.levels()["special.suppliesCrystal"] ?? "0"}
            onInput={(next) => tokens.setUpgradeLevel("special.suppliesCrystal", next)}
            min={0}
            step={1}
          />
          <IntegerField
            label="BB-Bot duration"
            value={tokens.levels()["special.bbbotDuration"] ?? "0"}
            onInput={(next) => tokens.setUpgradeLevel("special.bbbotDuration", next)}
            min={0}
            step={1}
          />
          <IntegerField
            label="BB-Bot token"
            value={tokens.levels()["special.bbbotToken"] ?? "0"}
            onInput={(next) => tokens.setUpgradeLevel("special.bbbotToken", next)}
            min={0}
            step={1}
          />
        </div>
      </div>
    </InfoCard>
  )
}
