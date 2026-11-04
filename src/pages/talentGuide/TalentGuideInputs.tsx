import { For, Show } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { CheckboxField, DisplayField, IntegerField, SelectField } from "../../components/ui/formControls"
import type { TalentRunType } from "./talentGuideCalculator"
import { useTalentGuideContext } from "./talentGuideContext"

export const TalentGuideInputs = () => {
  const {
    runType,
    setRunType,
    runOptions,
    se,
    setSe,
    lp,
    setLp,
    gCorpMaxed,
    setGCorpMaxed,
    allocation,
    previousLabel,
    changes,
    changeNotes,
  } = useTalentGuideContext()

  return (
    <>
      <InfoCard>
        <div class="grid gap-2">
          <SelectField
            label="Run type"
            value={runType()}
            onChange={(next) => setRunType(next as TalentRunType)}
            options={runOptions()}
          />
          <IntegerField label="SE" value={se()} onInput={setSe} min={1} max={200} step={1} />
          <IntegerField label="Total LP" value={lp()} onInput={setLp} min={0} step={1} />
          <CheckboxField
            label="G-Corp multiplier maxed"
            checked={gCorpMaxed()}
            onChange={setGCorpMaxed}
            tooltip="talentGuide.gCorp"
          />
        </div>
      </InfoCard>

      <Show when={previousLabel() !== undefined || allocation().notes.length > 0}>
        <InfoCard title={previousLabel() !== undefined ? `Changes from ${previousLabel()}` : "Changes"}>
          <div class="space-y-2 whitespace-pre-wrap text-sm leading-6 text-ink/80 dark:text-white/80">
            <Show when={previousLabel() !== undefined}>
              <div>
                <For each={changes()} fallback={<p>- No talent changes.</p>}>
                  {(line) => <p>{line}</p>}
                </For>
              </div>
            </Show>
            <For each={[...changeNotes(), ...allocation().notes]}>{(note) => <p>{note}</p>}</For>
          </div>
        </InfoCard>
      </Show>
    </>
  )
}
