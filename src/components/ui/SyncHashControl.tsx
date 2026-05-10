import { createPersistedSignal } from "../../lib/persistedSignal"
import { getOrCreateSyncHash, SYNC_HASH_KEY } from "../../lib/cloudSync"

const sanitizeHash = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64)

export const SyncHashControl = () => {
  const [syncHash, setSyncHash] = createPersistedSignal(SYNC_HASH_KEY, getOrCreateSyncHash())

  const handleInput = (rawValue: string) => {
    setSyncHash(sanitizeHash(rawValue))
  }

  const ensureHash = () => {
    const current = syncHash()
    if (current.trim()) return
    setSyncHash(getOrCreateSyncHash())
  }

  return (
    <div>
      <label
        for="sync-hash"
        class="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-ink/70 dark:text-white/70"
      >
        Sync Hash
      </label>
      <input
        id="sync-hash"
        type="text"
        value={syncHash()}
        onInput={(event) => handleInput(event.currentTarget.value)}
        onBlur={ensureHash}
        spellcheck={false}
        autocomplete="off"
        autocapitalize="none"
        class="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2 font-mono text-sm font-semibold text-ink outline-none ring-brand/40 transition focus:ring dark:border-white/20 dark:bg-[#1a2638] dark:text-white"
      />
    </div>
  )
}
