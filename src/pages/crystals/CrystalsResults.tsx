import { For, Show } from "solid-js"
import { BestNextSummary } from "../../components/layout/BestNextSummary"
import { getTooltip } from "../../lib/tooltips"
import { formatCrystalCost } from "./crystalsFormat"
import { useCrystalsContext } from "./crystalsContext"

const MAX_LISTED_NAMES = 4

export const CrystalsResults = () => {
  const crystals = useCrystalsContext()
  const recommendation = () => crystals.recommendation()
  const savingFor = () => recommendation().savingFor
  const savingNames = () => {
    const names = savingFor().names
    const extra = names.length - MAX_LISTED_NAMES
    return extra > 0 ? `${names.slice(0, MAX_LISTED_NAMES).join(", ")} and ${extra} more` : names.join(", ")
  }
  const showGpBoosterNote = () => recommendation().actions[0]?.id === "special.gpBooster"
  const hasNotes = () => savingFor().names.length > 0 || recommendation().doneNotes.length > 0 || showGpBoosterNote()

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
          { label: "Buy 50", onClick: () => crystals.applyCount(50) },
          { label: "Buy 100", onClick: () => crystals.applyCount(100) },
          {
            label: "Buy everything",
            onClick: crystals.completeAll,
            confirm: "Set every crystal upgrade to its maximum level, including locked upgrades?",
          },
          { label: "Reset all purchases", onClick: crystals.resetAll, confirm: "Reset all crystal purchases?" },
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
              <Show when={showGpBoosterNote()}>
                <p>{getTooltip("crystal.gpBooster")}</p>
              </Show>
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
