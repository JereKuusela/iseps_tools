import { Panel } from "../components/layout/Panel"
import { SyncControl } from "../components/ui/SyncHashControl"

export const SettingsPage = () => {
  return (
    <Panel title="Settings">
      <SyncControl />
    </Panel>
  )
}
