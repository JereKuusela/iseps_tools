import { Panel } from "../../components/layout/Panel"
import { SplitColumns } from "../../components/layout/SplitColumns"
import { ScInputs } from "./ScInputs"
import { ScResults } from "./ScResults"

export const ScPage = () => (
  <Panel title="Singularity Calculator" tooltip="sc.panel">
    <SplitColumns
      layoutClass="xl:grid-cols-[minmax(280px,350px)_minmax(0,1fr)]"
      rightClass="overflow-x-auto"
      right={<ScResults />}
    >
      <ScInputs />
    </SplitColumns>
  </Panel>
)
