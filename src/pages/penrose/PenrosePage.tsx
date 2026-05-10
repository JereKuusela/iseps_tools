import { Panel } from "../../components/layout/Panel"
import { ZatDataProvider } from "../../lib/zatContext"
import { PenroseLeftColumn } from "./PenroseLeftColumn"
import { PenroseProvider } from "./penroseContext"

const PenroseContent = () => {
  return (
    <Panel title="Penrose" tooltip="penrose.panel">
      <div class="max-w-md">
        <PenroseLeftColumn />
      </div>
    </Panel>
  )
}

export const PenrosePage = () => {
  return (
    <ZatDataProvider>
      <PenroseProvider>
        <PenroseContent />
      </PenroseProvider>
    </ZatDataProvider>
  )
}
