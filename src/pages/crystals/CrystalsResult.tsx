import { BestNextSummary } from "../../components/layout/BestNextSummary"
import { formatCrystalCost } from "./crystalFormat"
import { useCrystalsContext } from "./crystalsContext"

export const CrystalsResult = () => {
  const crystals = useCrystalsContext()
  const recommendation = () => crystals.recommendation()

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
      />
    </div>
  )
}
