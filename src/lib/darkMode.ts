import { createEffect, createRoot, type Signal } from "solid-js"
import { createSyncedSignal } from "./persistedSignal"

const darkModeSignal = createRoot<Signal<boolean>>(() => {
  const [darkMode, setDarkMode] = createSyncedSignal("ui.darkMode", false)

  createEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode())
  })

  return [darkMode, setDarkMode]
})

export const useDarkModeSignal = (): Signal<boolean> => darkModeSignal
