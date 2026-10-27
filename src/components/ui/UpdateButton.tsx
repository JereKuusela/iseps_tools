import { Show } from "solid-js"
import { updateAvailable } from "../../lib/versionCheck"

export const UpdateButton = () => (
  <Show when={updateAvailable()}>
    <button
      type="button"
      class="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-orange-600"
      onClick={() => window.location.reload()}
    >
      New version available - Reload
    </button>
  </Show>
)
