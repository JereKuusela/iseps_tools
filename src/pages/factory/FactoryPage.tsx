import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { FactoryProvider } from "./factoryContext"
import { FactoryInputs } from "./FactoryInputs"
import { FactoryResults } from "./FactoryResults"

export const FactoryPage = () => (
  <FactoryProvider>
    <Panel title="Factory" tooltip="factory.panel">
      <SplitColumns layoutClass="xl:grid-cols-[1.02fr_1.45fr]" right={<FactoryResults />}>
        <FactoryInputs />
      </SplitColumns>
    </Panel>
  </FactoryProvider>
)
