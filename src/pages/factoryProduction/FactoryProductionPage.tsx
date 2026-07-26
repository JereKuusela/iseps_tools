import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { FactoryProductionProvider } from "./factoryProductionContext"
import { FactoryProductionLeftColumn } from "./FactoryProductionLeftColumn"
import { FactoryProductionRightColumn } from "./FactoryProductionRightColumn"

const FactoryProductionContent = () => {
  return (
    <Panel title="Factory Production" tooltip="factoryProduction.panel">
      <SplitColumns layoutClass="xl:grid-cols-[1.02fr_1.45fr]" right={<FactoryProductionRightColumn />}>
        <FactoryProductionLeftColumn />
      </SplitColumns>
    </Panel>
  )
}

export const FactoryProductionPage = () => {
  return (
    <FactoryProductionProvider>
      <FactoryProductionContent />
    </FactoryProductionProvider>
  )
}
