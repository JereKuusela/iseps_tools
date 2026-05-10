import { Panel } from "../../components/layout/Panel"
import { ScLeftColumn } from "./ScLeftColumn"
import { ScRightColumn } from "./ScRightColumn"

export const ScPage = () => {
  return (
    <Panel title="Singularity Calculator" tooltip="sc.panel">
      <div class="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(280px,350px)_minmax(0,1fr)]">
        <div class="min-w-0">
          <ScLeftColumn />
        </div>
        <div class="min-w-0 overflow-x-auto">
          <ScRightColumn />
        </div>
      </div>
    </Panel>
  )
}
