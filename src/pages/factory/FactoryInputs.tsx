import { Show } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { CheckboxField, DisplayField, IntegerField } from "../../components/ui/formControls"
import { OptionSliderField, SliderField } from "../../components/ui/SliderField"
import { useFactoryContext } from "./factoryContext"
import { PARTICLE_WEIGHT_OPTIONS } from "./factoryTypes"

export const FactoryInputs = () => {
  const factory = useFactoryContext()

  return (
    <>
      <InfoCard>
        <div class="grid gap-1">
          <IntegerField
            label="Prestige fills"
            value={factory.prestigesDone()}
            onInput={factory.setPrestigesDone}
            min={0}
            step={1}
            tooltip="factory.prestiges"
          />
          <DisplayField
            label="Points"
            tooltip="factory.points"
            value={`${factory.availablePoints()} / ${factory.totalPoints()}`}
          />
          <CheckboxField label="Advanced mode" checked={factory.advancedMode()} onChange={factory.setAdvancedMode} />
        </div>
      </InfoCard>

      <Show when={factory.advancedMode()}>
        <InfoCard title="Evaluation weights" tooltip="factory.weights">
          <div class="grid gap-3">
            <IntegerField
              label="Particle levels"
              value={factory.totalParticleLevel()}
              onInput={factory.setTotalParticleLevel}
              min={0}
              step={1}
              tooltip="factory.particleLevel"
            />
            <SliderField
              label="Fabricator output"
              value={factory.productionWeightPercent}
              onInput={factory.setProductionWeightPercent}
              min={0}
              max={50}
              step={10}
            />
            <OptionSliderField
              label="Particle output"
              options={PARTICLE_WEIGHT_OPTIONS}
              value={factory.particleWeightMultiplier}
              onInput={factory.setParticleWeightMultiplier}
            />
          </div>
        </InfoCard>
      </Show>
    </>
  )
}
