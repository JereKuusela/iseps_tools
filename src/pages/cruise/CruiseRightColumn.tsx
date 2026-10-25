import { LevelTablePanel } from "../../components/layout/LevelTablePanel"
import { useCruiseContext } from "./cruiseContext"
import { CruiseNotationField } from "./CruiseNotationField"

export const CruiseRightColumn = () => {
  const cruise = useCruiseContext()

  return (
    <LevelTablePanel
      rows={cruise.evaluationRows()}
      bestNodeId={cruise.bestNodeId()}
      optimalLevels={cruise.optimalLevels()}
      isOptimal={cruise.isOptimal()}
      optimality={cruise.optimality()}
      onBuyNext={cruise.applyNext}
      onApplyOptimal={cruise.applyOptimal}
      onReset={cruise.resetAll}
      onSetLevel={cruise.setNodeLevel}
      footer={<CruiseNotationField />}
    />
  )
}
