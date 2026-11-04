import { LevelTablePanel } from "../../components/layout/LevelTablePanel"
import { useFactoryContext } from "./factoryContext"
import { FACTORY_NODE_DEFINITIONS, emptyFactoryNodeLevels } from "./factoryTypes"
import { NotationField } from "../../components/ui/NotationField"

export const FactoryResults = () => {
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
      footer={
        <NotationField
          nodes={FACTORY_NODE_DEFINITIONS}
          levels={factory.nodeLevels}
          onChange={factory.setNodeLevels}
          emptyLevels={emptyFactoryNodeLevels}
          tooltip="factory.notation"
        />
      }
    />
  )
}
