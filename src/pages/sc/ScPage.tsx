import { Panel } from "../../components/layout/Panel"
import { ScLeftColumn } from "./ScLeftColumn"
import { ScRightColumn } from "./ScRightColumn"

export const ScPage = () => {
  return (
    <Panel title="Singularity Calculator" tooltip="sc.panel" width="full">
      <div class="grid gap-3 xl:grid-cols-[350px_max-content]">
        <ScLeftColumn />

        <ScRightColumn />
      </div>
    </Panel>
  )
}
