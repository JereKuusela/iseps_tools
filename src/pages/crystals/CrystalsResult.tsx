import { For, Show } from "solid-js"
import { BestNextSummary } from "../../components/layout/BestNextSummary"
import { formatCrystalCost } from "./crystalFormat"
import { useCrystalsContext } from "./crystalsContext"

const MAX_LISTED_NAMES = 4

export const CrystalsResult = () => {
  const crystals = useCrystalsContext()
  const recommendation = () => crystals.recommendation()
  const savingFor = () => recommendation().savingFor
  const savingNames = () => {
    const names = savingFor().names
    const extra = names.length - MAX_LISTED_NAMES
    return extra > 0 ? `${names.slice(0, MAX_LISTED_NAMES).join(", ")} and ${extra} more` : names.join(", ")
  }
  const hasNotes = () => savingFor().names.length > 0 || recommendation().doneNotes.length > 0

  return (
    <div class="grid gap-3">
      <BestNextSummary
        buyAction={crystals.applyBest}
        buyDisabled={recommendation().actions.length === 0}
        buyLabel="Buy best next"
        bulkActions={[
          { label: "Complete step", onClick: crystals.applyStep },
          { label: "Buy 5", onClick: () => crystals.applyCount(5) },
          { label: "Buy 10", onClick: () => crystals.applyCount(10) },
          { label: "Buy 25", onClick: () => crystals.applyCount(25) },
        ]}
        rows={recommendation().actions.map((action, index) => ({
          item:
            action.maxLevel === 1
              ? action.name
              : index === 0 && action.targetLevel > action.currentLevel + 1
                ? `${action.name}: ${action.currentLevel} → ${action.targetLevel}`
                : `${action.name}: ${action.targetLevel}`,
          targetLevel: null,
          value: "",
          data: `${formatCrystalCost(action.cost)}${index === 0 ? " crystals" : ""}`,
        }))}
        dataHeader="Cost"
        minRows={7}
        columnRatios={[75, 0, 25]}
        hideValue
        footer={
          <Show when={hasNotes()}>
            <div class="grid gap-2 p-3 text-sm text-ink/85 dark:text-white/85">
              <For each={recommendation().doneNotes}>{(note) => <p>{note}</p>}</For>
              <Show when={savingFor().names.length > 0}>
                <p>
                  Save up {formatCrystalCost(savingFor().cost)} crystals for: {savingNames()}.
                </p>
              </Show>
            </div>
          </Show>
        }
      />
    </div>
  )
}
