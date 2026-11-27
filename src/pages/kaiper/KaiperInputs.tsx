import { For } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { CheckboxField, IntegerField, NumberField, NumberFieldWithUnit } from "../../components/ui/formControls"
import { LevelSelectField } from "../../components/ui/LevelSelectField"
import { PARTICLE_ORDER } from "../../lib/particles"
import { capitalize } from "../../lib/textFormat"
import { PARTICLE_GAIN_UNITS, type ParticleGainUnit } from "../../shared/particleInputs"
import { DCM_LEVEL_OPTIONS, RESEARCH_LEVEL_OPTIONS } from "./kaiperData"
import { useKaiperContext } from "./kaiperContext"

const otherParticles = PARTICLE_ORDER.filter((particle) => particle !== "kappa")

export const KaiperInputs = () => {
  const kaiper = useKaiperContext()
  const kappa = kaiper.kappa
  const cash = kaiper.cash

  return (
    <>
      <InfoCard>
        <div class="grid gap-1">
          <IntegerField label="Current SE" value={kaiper.se()} onInput={kaiper.setSe} min={0} step={1} />
          <NumberFieldWithUnit
            label="Kappa"
            value={kappa.gain()}
            onInput={kappa.setGain}
            placeholder="0.00e0"
            unit={kappa.unit()}
            onUnitChange={(next) => kappa.setUnit(next as ParticleGainUnit)}
            units={PARTICLE_GAIN_UNITS}
            wide
          />
          <NumberField label="Current" placeholder="0.00e0" value={kappa.current()} onInput={kappa.setCurrent} />
          <NumberFieldWithUnit
            label="Cash"
            value={cash.gain()}
            onInput={cash.setGain}
            placeholder="0.00e0"
            unit={cash.unit()}
            onUnitChange={(next) => cash.setUnit(next as ParticleGainUnit)}
            units={PARTICLE_GAIN_UNITS}
            wide
          />
          <NumberField label="Current" placeholder="0.00e0" value={cash.current()} onInput={cash.setCurrent} />
        </div>
      </InfoCard>

      <InfoCard title="Particles" closable>
        <div class="grid gap-1">
          <For each={otherParticles}>
            {(particle) => {
              const inputs = kaiper.particleInputs[particle]
              return (
                <>
                  <NumberFieldWithUnit
                    label={capitalize(particle)}
                    value={inputs.gain()}
                    onInput={inputs.setGain}
                    placeholder="0.00e0"
                    unit={inputs.unit()}
                    onUnitChange={(next) => inputs.setUnit(next as ParticleGainUnit)}
                    units={PARTICLE_GAIN_UNITS}
                    wide
                  />
                  <NumberField
                    label="Current"
                    placeholder="0.00e0"
                    value={inputs.current()}
                    onInput={inputs.setCurrent}
                  />
                </>
              )
            }}
          </For>
        </div>
      </InfoCard>

      <InfoCard title="Cost reductions" closable>
        <div class="grid gap-1">
          <LevelSelectField
            label="DCM level"
            value={kaiper.dcmLevel()}
            onChange={kaiper.setDcmLevel}
            options={DCM_LEVEL_OPTIONS}
          />
          <LevelSelectField
            label="Research level"
            value={kaiper.researchLevel()}
            onChange={kaiper.setResearchLevel}
            options={RESEARCH_LEVEL_OPTIONS}
          />
          <For each={Object.entries(kaiper.qaSignals)}>
            {([id, [level, setLevel]]) => (
              <IntegerField label={`QA ${id}`} value={level()} onInput={setLevel} min={0} step={1} />
            )}
          </For>
        </div>
      </InfoCard>

      <InfoCard title="Kappa exponent sources" closable>
        <div class="grid gap-1">
          <NumberField label="Base exponent" value={kaiper.baseExponent()} onInput={kaiper.setBaseExponent} />
          <NumberField label="Extra exponent" value={kaiper.extraExponent()} onInput={kaiper.setExtraExponent} />
          <CheckboxField
            label="Meltdown bundle"
            checked={kaiper.meltdownBundle()}
            onChange={kaiper.setMeltdownBundle}
          />
          <CheckboxField
            label="Sequencing bundle"
            checked={kaiper.sequencingBundle()}
            onChange={kaiper.setSequencingBundle}
          />
        </div>
      </InfoCard>
    </>
  )
}
