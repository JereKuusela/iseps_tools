import { For, Show } from "solid-js"
import { InfoCard } from "../../components/layout/contentBlocks"
import { IntegerField, SelectField } from "../../components/ui/formControls"
import type { PerkRunType } from "../../lib/perkContext"
import { usePerkGuideContext } from "./perkGuideContext"

const formatSe = (se: number) => `SE${String(se).padStart(2, "0")}`

export const PerkGuideLeftColumn = () => {
  const {
    se,
    setSe,
    runType,
    setRunType,
    runOptions,
    requestedSe,
    selectedEntry,
    previousEntry,
    selectedChangesText,
    hasDataForCurrentSelection,
  } = usePerkGuideContext()

  return (
    <>
      <InfoCard>
        <div class="grid gap-2">
          <IntegerField label="SE" value={se()} onInput={setSe} min={1} max={200} step={1} />
          <SelectField
            label="Run type"
            value={runType()}
            onChange={(next) => setRunType(next as PerkRunType)}
            options={runOptions()}
          />
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
        <Show when={!hasDataForCurrentSelection()}>
          <InfoCard>
            <p class="text-sm text-ink/70 dark:text-white/70">
              No guide for {formatSe(requestedSe())}. Showing guide for {formatSe(selectedEntry()!.se)}.
            </p>
          </InfoCard>
        </Show>

        <InfoCard title={previousEntry() ? `Changes from ${formatSe(previousEntry()!.se)}` : "Changes"}>
          <div class="text-sm leading-6 text-ink/80 dark:text-white/80">
            <For each={selectedChangesText()}>{(line) => <p>{line}</p>}</For>
          </div>
        </InfoCard>

        <Show when={selectedEntry()!.notes}>
          <InfoCard title="Useful notes">
            <p class="text-sm leading-6 text-ink/80 dark:text-white/80 whitespace-pre-wrap">{selectedEntry()!.notes}</p>
          </InfoCard>
        </Show>
      </Show>
    </>
  )
}
