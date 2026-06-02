import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { CruiseProvider } from "./cruiseContext"
import { CruiseLeftColumn } from "./CruiseLeftColumn"
import { CruiseRightColumn } from "./CruiseRightColumn"

const CruiseContent = () => {
  return (
    <Panel title="Cruise" tooltip="cruise.panel">
      <SplitColumns layoutClass="xl:grid-cols-[1.02fr_1.45fr]" right={<CruiseRightColumn />}>
        <CruiseLeftColumn />
      </SplitColumns>
    </Panel>
  )
}

export const CruisePage = () => {
  return (
    <CruiseProvider>
      <CruiseContent />
    </CruiseProvider>
  )
}
