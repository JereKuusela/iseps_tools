import { Panel } from "../components/layout/Panel"
import { SyncControl } from "../components/ui/SyncHashControl"
import { CreditsPage } from "./CreditsPage"

export const SettingsPage = () => {
  return (
    <div class="space-y-4">
      <Panel title="Settings">
        <SyncControl />
      </Panel>

      <CreditsPage />
    </div>
  )
}
