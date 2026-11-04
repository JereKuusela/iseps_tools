import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { CruiseProvider } from "./cruiseContext"
import { CruiseInputs } from "./CruiseInputs"
import { CruiseResults } from "./CruiseResults"

export const CruisePage = () => (
  <CruiseProvider>
    <Panel title="Cruise" tooltip="cruise.panel">
      <SplitColumns layoutClass="xl:grid-cols-[1.02fr_1.45fr]" right={<CruiseResults />}>
        <CruiseInputs />
      </SplitColumns>
    </Panel>
  </CruiseProvider>
)
