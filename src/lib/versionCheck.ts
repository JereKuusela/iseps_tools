import { createSignal } from "solid-js"

const CHECK_INTERVAL_MS = 10 * 60 * 1000
const MIN_GAP_MS = 60 * 1000

const [updateAvailable, setUpdateAvailable] = createSignal(false)
export { updateAvailable }

const currentId = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : null
let lastCheck = 0

const check = async () => {
  if (!currentId || updateAvailable()) return
  const now = Date.now()
  if (now - lastCheck < MIN_GAP_MS) return
  lastCheck = now
  try {
    const response = await fetch(`/version.json?t=${now}`, { cache: "no-store" })
    if (!response.ok) return
    const data = (await response.json()) as { id?: string }
    if (data.id && data.id !== currentId) setUpdateAvailable(true)
  } catch {
    // offline or transient failure; retry on next trigger
  }
}

export const startVersionCheck = () => {
  if (!currentId || import.meta.env.DEV) return () => {}

  const onVisible = () => {
    if (document.visibilityState === "visible") void check()
  }
  const onPreloadError = () => setUpdateAvailable(true)

  void check()
  const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS)
  document.addEventListener("visibilitychange", onVisible)
  window.addEventListener("vite:preloadError", onPreloadError)

  return () => {
    window.clearInterval(timer)
    document.removeEventListener("visibilitychange", onVisible)
    window.removeEventListener("vite:preloadError", onPreloadError)
  }
}
