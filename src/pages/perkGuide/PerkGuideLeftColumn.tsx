import { For, Show } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { IntegerField, SelectField } from "../../components/ui/formControls"
import { usePerkGuideContext } from "./perkGuideContext"

const formatSe = (se: number) => `SE${String(se).padStart(2, "0")}`

export const PerkGuideLeftColumn = () => {
  const {
    se,
    setSe,
    runType,
    setRunType,
    runOptions,
    guideOptions,
    selectedGuideKey,
    setSelectedGuideKey,
    selectedEntry,
    previousEntry,
  } = usePerkGuideContext()

  return (
    <>
      <InfoCard>
        <div class="grid gap-2">
          <IntegerField label="SE" value={se()} onInput={setSe} min={1} max={200} step={1} />
          <SelectField
            label="Run type"
            value={runType()}
            onChange={(next) => setRunType(next)}
            options={runOptions()}
          />
          <Show when={guideOptions().length > 1}>
            <div class="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-2">
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink/75 dark:text-white/75">Guide</p>
              <div class="min-w-0 rounded-xl border border-ink/20 bg-white/70 p-1 dark:border-white/15 dark:bg-[#1a2638]">
                <div class="grid grid-flow-col auto-cols-fr gap-1">
                  <For each={guideOptions()}>
                    {(option) => (
                      <button
                        type="button"
                        onClick={() => setSelectedGuideKey(option.value)}
                        class="rounded-lg px-2 py-1.5 text-sm font-semibold transition"
                        classList={{
                          "bg-brand text-white shadow-sm": selectedGuideKey() === option.value,
                          "text-ink/80 hover:bg-ink/5 dark:text-white/80 dark:hover:bg-white/10":
                            selectedGuideKey() !== option.value,
                        }}
                      >
                        {option.label}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </InfoCard>

      <Show
        when={selectedEntry()}
        fallback={
          <InfoCard>
            <p class="text-sm text-ink/70 dark:text-white/70">No guide row found for this SE and run type.</p>
          </InfoCard>
        }
      >
        <InfoCard title={previousEntry() ? `Changes from ${formatSe(previousEntry()!.se)}` : "Changes"}>
          <p class="text-sm leading-6 text-ink/80 dark:text-white/80 whitespace-pre-wrap">
            {selectedEntry()!.changes || "No change note available for this SE."}
          </p>
        </InfoCard>

        <InfoCard title="Useful notes">
          <p class="text-sm leading-6 text-ink/80 dark:text-white/80 whitespace-pre-wrap">
            {selectedEntry()!.notes || "No additional notes for this SE."}
          </p>
        </InfoCard>
      </Show>
    </>
  )
}
