import { Panel } from "../../components/layout/Panel"
import { SyncControl } from "../../components/ui/SyncControl"
import { resourceTextOnly, setResourceTextOnly } from "../../lib/resourceDisplay"
import { Credits } from "./Credits"

export const SettingsPage = () => {
  return (
    <Panel title="Settings">
      <div class="space-y-6">
        <SyncControl />
        <section class="space-y-3">
          <h3 class="text-lg font-bold text-ink dark:text-white">Display</h3>
          <label class="flex w-fit items-center gap-2 text-sm text-ink dark:text-white">
            <input
              type="checkbox"
              checked={resourceTextOnly()}
              onChange={(event) => setResourceTextOnly(event.currentTarget.checked)}
            />
            Text-only resource labels
          </label>
        </section>
        <section class="space-y-3">
          <h3 class="text-lg font-bold text-ink dark:text-white">Credits</h3>
          <Credits />
        </section>
      </div>
    </Panel>
  )
}
