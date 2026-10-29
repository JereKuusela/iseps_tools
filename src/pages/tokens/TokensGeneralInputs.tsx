import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import { CheckboxField, IntegerField, SelectField } from "../../components/ui/formControls"
import { LargeNumber } from "../../lib/largeNumber"
import { formatLargeNumber } from "../../lib/numberFormat"
import { PARTICLE_ORDER, type UnlockedParticle } from "../../lib/particles"
import { useTokensContext } from "./tokensContext"

const formatSpent = (value: number) => {
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) return Math.trunc(rounded).toLocaleString("en-US")
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

export const TokensGeneralInputs = () => {
  const tokens = useTokensContext()
  const unlockedParticleOptions = () =>
    PARTICLE_ORDER.map((id) => ({ value: id, label: id.charAt(0).toUpperCase() + id.slice(1) }))

  return (
    <InfoCard>
      <div class="grid gap-1">
        <IntegerField
          label="Online Hrs"
          tooltip="token.onlineHours"
          value={tokens.onlineHoursPerDay()}
          onInput={tokens.setOnlineHoursPerDay}
          min={0}
          max={24}
          step={1}
        />
        <IntegerField
          label="Tokens per step"
          tooltip="token.tokensPerStep"
          value={tokens.tokensPerStep()}
          onInput={tokens.setTokensPerStep}
          min={0}
          step={1}
        />
        <SelectField
          label="Unlocked particle"
          value={tokens.unlockedParticle()}
          onChange={(next) => tokens.setUnlockedParticle(next as UnlockedParticle)}
          options={unlockedParticleOptions()}
        />

        <CheckboxField
          label="Gamma Supplies and BB-Bot"
          checked={tokens.unlockGammaSuppliesBbBot()}
          onChange={tokens.setUnlockGammaSuppliesBbBot}
        />
        <CheckboxField
          label="Helion Supplies and BB-Bot"
          checked={tokens.unlockHelionSuppliesBbBot()}
          onChange={tokens.setUnlockHelionSuppliesBbBot}
        />

        <div class="rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56] mt-1.25">
          <MetricRow
            label="Tokens spent"
            value={
              tokens.isLoading() || tokens.loadError()
                ? "-"
                : formatLargeNumber(LargeNumber.from(tokens.totalTokensSpent()), 2)
            }
            withBorder={false}
          />
        </div>
      </div>
    </InfoCard>
  )
}
