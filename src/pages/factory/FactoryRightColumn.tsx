import { LevelTablePanel } from "../../components/layout/LevelTablePanel"
import { useFactoryContext } from "./factoryContext"

export const FactoryRightColumn = () => {
  const factory = useFactoryContext()

  return (
    <LevelTablePanel
      rows={factory.evaluationRows()}
      bestNodeId={factory.bestNodeId()}
      optimalLevels={factory.optimalLevels()}
      isOptimal={factory.isOptimal()}
      optimality={factory.optimality()}
      onBuyNext={factory.applyNext}
      onApplyOptimal={factory.applyOptimal}
      onReset={factory.resetAll}
      onSetLevel={factory.setNodeLevel}
    />
  )
}
