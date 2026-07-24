import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { FactoryProvider } from "./factoryContext"
import { FactoryLeftColumn } from "./FactoryLeftColumn"
import { FactoryRightColumn } from "./FactoryRightColumn"

const FactoryContent = () => {
  return (
    <Panel title="Factory" tooltip="factory.panel">
      <SplitColumns layoutClass="xl:grid-cols-[1.02fr_1.45fr]" right={<FactoryRightColumn />}>
        <FactoryLeftColumn />
      </SplitColumns>
    </Panel>
  )
}

export const FactoryPage = () => {
  return (
    <FactoryProvider>
      <FactoryContent />
    </FactoryProvider>
  )
}
