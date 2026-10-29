import { Panel } from "../components/layout/Panel"
import { SyncControl } from "../components/ui/SyncHashControl"
import { Credits } from "./Credits"

export const SettingsPage = () => {
  return (
    <Panel title="Settings">
      <div class="space-y-6">
        <SyncControl />
        <section class="space-y-3">
          <h3 class="text-lg font-bold text-ink dark:text-white">Credits</h3>
          <Credits />
        </section>
      </div>
    </Panel>
  )
}
