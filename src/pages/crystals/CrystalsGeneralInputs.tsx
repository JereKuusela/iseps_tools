import { InfoCard, MetricRow } from "../../components/layout/contentBlocks"
import { IntegerField, SelectField } from "../../components/ui/formControls"
import { PARTICLE_ORDER, type UnlockedParticle } from "../../lib/particles"
import { formatCrystalCost } from "./crystalFormat"
import { useCrystalsContext } from "./crystalsContext"

export const CrystalsGeneralInputs = () => {
  const crystals = useCrystalsContext()
  const particleOptions = () =>
    PARTICLE_ORDER.map((id) => ({ value: id, label: id.charAt(0).toUpperCase() + id.slice(1) }))

  return (
    <InfoCard>
      <div class="grid gap-1">
        <IntegerField label="SE" value={crystals.se()} onInput={crystals.setSe} min={0} step={1} />
        <IntegerField
          label="Player level"
          value={crystals.playerLevel()}
          onInput={crystals.setPlayerLevel}
          min={0}
          step={1}
        />
        <SelectField
          label="Unlocked particle"
          value={crystals.unlockedParticle()}
          onChange={(next) => crystals.setUnlockedParticle(next as UnlockedParticle)}
          options={particleOptions()}
        />

        <div class="mt-1.25 rounded border border-ink/20 bg-white dark:border-white/15 dark:bg-[#253a56]">
          <MetricRow label="Crystals spent" value={formatCrystalCost(crystals.crystalsSpent())} withBorder={false} />
        </div>
      </div>
    </InfoCard>
  )
}
