import { createPersistedSignal } from "../../lib/persistedSignal"
import {
  createRandomSyncHash,
  pullFromCloudNow,
  SYNC_ENABLED_KEY,
  SYNC_HASH_KEY as SYNC_KEY,
  SYNC_TIMESTAMP_KEY,
} from "../../lib/cloudSync"
import { Show } from "solid-js"

const sanitizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64)

export const SyncControl = () => {
  const [syncKey, setSyncKey] = createPersistedSignal(SYNC_KEY, "")
  const [syncEnabled, setSyncEnabled] = createPersistedSignal(SYNC_ENABLED_KEY, false)
  const [lastSyncTimestamp] = createPersistedSignal<number>(SYNC_TIMESTAMP_KEY, 0)

  const isHashEmpty = () => syncKey().trim().length === 0
  const isSyncActive = () => syncEnabled() && !isHashEmpty()

  const handleInput = (rawValue: string) => {
    const nextKey = sanitizeKey(rawValue)
    setSyncKey(nextKey)
    // Key edits should always require explicit re-enable.
    setSyncEnabled(false)
  }

  const randomizeKey = () => {
    setSyncKey(createRandomSyncHash())
    setSyncEnabled(false)
  }

  const handleEnabledChange = (nextEnabled: boolean) => {
    if (!nextEnabled) {
      setSyncEnabled(false)
      return
    }

    if (isHashEmpty()) {
      setSyncEnabled(false)
      return
    }

    setSyncEnabled(true)
    void pullFromCloudNow().catch(() => {
      // Keep settings UX responsive if remote fetch fails.
    })
  }

  const formattedTimestamp = () => {
    const timestamp = lastSyncTimestamp()
    if (!Number.isFinite(timestamp) || timestamp <= 0) return "Never"
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp))
  }

  return (
    <div class="max-w-xl rounded-2xl border border-ink/15 bg-white/70 p-4 dark:border-white/15 dark:bg-[#182538]/75 sm:p-5">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-ink/80 dark:text-white/80">Data sync</h3>
      </div>
      <p class="mt-2 text-sm leading-relaxed text-ink/75 dark:text-white/75">
        Data can be synced across devices by using the same data key.
      </p>
      <p class="mt-2 text-sm leading-relaxed text-ink/75 dark:text-white/75">Use a key that is hard to guess.</p>

      <div class="mt-4 grid gap-3">
        <div>
          <div class="mt-1 flex gap-2">
            <input
              id="sync-key"
              type="text"
              value={syncKey()}
              onInput={(event) => handleInput(event.currentTarget.value)}
              spellcheck={false}
              autocomplete="off"
              autocapitalize="none"
              class="min-w-0 flex-1 rounded-xl border border-ink/20 bg-white px-3 py-2 font-mono text-sm font-semibold text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/20 dark:bg-[#1a2638] dark:text-white"
            />
            <button
              type="button"
              onClick={randomizeKey}
              class="rounded-xl border border-ink/20 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink/80 transition hover:border-ink/35 hover:text-ink dark:border-white/20 dark:bg-[#1a2638] dark:text-white/80 dark:hover:border-white/40 dark:hover:text-white"
            >
              Random
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleEnabledChange(!isSyncActive())}
          disabled={isHashEmpty()}
          class="rounded-xl border border-ink/20 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink/80 transition hover:border-ink/35 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-[#1a2638] dark:text-white/80 dark:hover:border-white/40 dark:hover:text-white"
        >
          {isSyncActive() ? "Disable sync" : "Enable sync"}
        </button>
        <Show when={isSyncActive()}>
          <p class="mt-2 text-xs text-ink/65 dark:text-white/65">Last sync: {formattedTimestamp()}</p>
        </Show>
        <Show when={!isSyncActive()}>
          <p class="mt-2 text-xs text-ink/65 dark:text-white/65">Last sync: Not synced.</p>
        </Show>
      </div>
    </div>
  )
}
