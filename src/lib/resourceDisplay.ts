import { createRoot } from "solid-js"
import { createPersistedSignal } from "./persistedSignal"

export const [resourceTextOnly, setResourceTextOnly] = createRoot(() =>
  createPersistedSignal("ui.resourceTextOnly", false),
)
