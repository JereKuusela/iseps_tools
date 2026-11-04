import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { FactoryProductionProvider } from "./factoryProductionContext"
import { FactoryProductionInputs } from "./FactoryProductionInputs"
import { FactoryProductionResults } from "./FactoryProductionResults"

export const FactoryProductionPage = () => (
  <FactoryProductionProvider>
    <Panel title="Factory Production" tooltip="factoryProduction.panel">
      <SplitColumns layoutClass="xl:grid-cols-[1.02fr_1.45fr]" right={<FactoryProductionResults />}>
        <FactoryProductionInputs />
      </SplitColumns>
    </Panel>
  </FactoryProductionProvider>
)
