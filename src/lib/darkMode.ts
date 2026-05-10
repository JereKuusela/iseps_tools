import { createEffect, createRoot, type Signal } from "solid-js"
import { createPersistedSignal } from "./persistedSignal"

const darkModeSignal = createRoot<Signal<boolean>>(() => {
  const [darkMode, setDarkMode] = createPersistedSignal("ui.darkMode", false)

  createEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode())
  })

  return [darkMode, setDarkMode]
})

export const useDarkModeSignal = (): Signal<boolean> => darkModeSignal
