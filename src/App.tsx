import { A, useLocation } from "@solidjs/router"
import { For, type ParentComponent } from "solid-js"
import { useDarkModeSignal } from "./lib/darkMode"
import { ROUTES, tabs } from "./lib/routes"

const normalizePath = (path: string) => {
  if (!path || path === "/") {
    return "/"
  }

  return path.endsWith("/") ? path.slice(0, -1) : path
}

const TopNav = (props: { darkMode: boolean; onToggleDarkMode: () => void }) => {
  const location = useLocation()
  const isActivePath = (href: string) => normalizePath(location.pathname) === href

  return (
    <header class="relative z-10 hidden px-4 pt-5 sm:block sm:px-8 sm:pt-8 lg:px-10">
      <div class="mx-auto flex w-full max-w-6xl items-center gap-2.5 rounded-2xl border border-white/60 bg-white/70 p-2.5 shadow-glow backdrop-blur dark:border-white/10 dark:bg-[#111a28]/75 sm:gap-3 sm:p-3">
        <div class="min-w-[240px] flex-1 gap-2.5 sm:grid sm:grid-cols-2 lg:grid-cols-6">
          <For each={tabs}>
            {(tab) => (
              <A
                href={tab.href}
                class="rounded-xl px-4 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-ink hover:text-white dark:hover:bg-white/15"
                classList={{
                  "bg-ink text-white": isActivePath(tab.href),
                  "dark:bg-white/15": isActivePath(tab.href),
                }}
              >
                <p class="text-sm font-semibold tracking-wide">{tab.label}</p>
              </A>
            )}
          </For>
        </div>

        <A
          href={ROUTES.settings}
          class="grid h-10 w-10 place-items-center rounded-xl border border-ink/15 bg-white/85 text-ink transition hover:-translate-y-0.5 hover:border-ink/35 dark:border-white/20 dark:bg-[#1b2a3e] dark:text-white"
          classList={{
            "border-ink/35 bg-ink text-white dark:border-white/30 dark:bg-white/15": isActivePath(ROUTES.settings),
          }}
          aria-label="Open settings"
          title="Open settings"
        >
          🛠️
          <span class="sr-only">Open settings</span>
        </A>

        <button
          type="button"
          onClick={props.onToggleDarkMode}
          class="grid h-10 w-10 place-items-center rounded-xl border border-ink/15 bg-white/85 text-ink transition hover:-translate-y-0.5 hover:border-ink/35 dark:border-white/20 dark:bg-[#1b2a3e] dark:text-white"
          aria-label={props.darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={props.darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {props.darkMode ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M20.7 15.4A9 9 0 1 1 12.6 3.3a.8.8 0 0 1 .9 1.1 7 7 0 0 0 7.1 9.9.8.8 0 0 1 .1 1.1Z" />
            </svg>
          )}
          <span class="sr-only">{props.darkMode ? "Switch to light mode" : "Switch to dark mode"}</span>
        </button>
      </div>
    </header>
  )
}

const App: ParentComponent = (props) => {
  const [darkMode, setDarkMode] = useDarkModeSignal()

  return (
    <div class="relative min-h-screen overflow-x-auto overflow-y-visible bg-mist text-ink transition-colors dark:bg-[#070d16] dark:text-[#e8f0ff]">
      <div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,rgba(255,107,53,0.2),transparent_50%),radial-gradient(circle_at_90%_10%,rgba(10,143,148,0.25),transparent_45%),radial-gradient(circle_at_40%_85%,rgba(12,28,48,0.18),transparent_40%)] dark:bg-[radial-gradient(circle_at_12%_20%,rgba(255,107,53,0.22),transparent_46%),radial-gradient(circle_at_84%_16%,rgba(10,143,148,0.24),transparent_42%),radial-gradient(circle_at_50%_82%,rgba(143,182,255,0.2),transparent_40%)]" />
      <TopNav darkMode={darkMode()} onToggleDarkMode={() => setDarkMode((value) => !value)} />
      <main class="w-full px-4 pb-10 pt-4 sm:px-8 sm:pb-12 sm:pt-6 lg:px-10 lg:pb-14 lg:pt-8">{props.children}</main>
    </div>
  )
}

export default App
