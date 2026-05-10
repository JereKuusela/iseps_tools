import { Panel } from "../components/layout/Panel"
import { SyncHashControl } from "../components/ui/SyncHashControl"
import { Tooltip } from "../components/ui/Tooltip"

export const SettingsPage = () => {
  return (
    <Panel title="Settings" tooltip="settings.panel">
      <div class="max-w-xl rounded-2xl border border-ink/15 bg-white/70 p-4 dark:border-white/15 dark:bg-[#182538]/75 sm:p-5">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Sync</h3>
          <Tooltip content="settings.syncHash">i</Tooltip>
        </div>
        <p class="mt-2 text-sm leading-relaxed text-ink/75 dark:text-white/75">
          Use the same hash across devices to sync saved values.
        </p>
        <div class="mt-4">
          <SyncHashControl />
        </div>
      </div>
    </Panel>
  )
}
