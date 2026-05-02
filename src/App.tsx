import { A, useLocation } from "@solidjs/router"
import { createEffect, For, Match, Switch } from "solid-js"
import { createPersistedSignal } from "./lib/persistedSignal"
import { OgTechPage } from "./pages/OgTechPage"
import { PenrosePage } from "./pages/PenrosePage"
import { PremiumCrystalTokenPage, PremiumHaulerMinePage } from "./pages/PremiumPage"
import { ScPage } from "./pages/ScPage"
import { ZatGuidePage } from "./pages/ZatGuidePage"

type TabItem = { href: string; label: string; subtitle: string }

const tabs: TabItem[] = [
  { href: "/", label: "OG Tech", subtitle: "Juno run optimiser" },
  { href: "/zat-guide", label: "ZAT Guide", subtitle: "Tree planning" },
  { href: "/penrose", label: "Penrose", subtitle: "Cycle goals" },
  { href: "/sc", label: "SC", subtitle: "Singularity calculator" },
  { href: "/premium/crystal-token", label: "Premium Crystal", subtitle: "Chest and bot output" },
  { href: "/premium/hauler-mine", label: "Premium Hauler", subtitle: "Layer income by time" },
]

const TopNav = (props: { darkMode: boolean; onToggleDarkMode: () => void }) => {
  const location = useLocation()

  return (
    <header class="relative z-10 px-4 pt-5 sm:px-8 sm:pt-8 lg:px-10">
      <div class="mx-auto flex w-full max-w-6xl flex-wrap gap-2.5 rounded-2xl border border-white/60 bg-white/70 p-2.5 shadow-glow backdrop-blur dark:border-white/10 dark:bg-[#111a28]/75 sm:gap-3 sm:p-3">
        <div class="grid min-w-[240px] flex-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
          <For each={tabs}>
            {(tab) => (
              <A
                href={tab.href}
                class="rounded-xl px-4 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-ink hover:text-white dark:hover:bg-white/15"
                classList={{
                  "bg-ink text-white": location.pathname === tab.href,
                  "dark:bg-white/15": location.pathname === tab.href,
                }}
              >
                <p class="text-sm font-semibold tracking-wide">{tab.label}</p>
                <p
                  class="text-xs text-ink/65 dark:text-white/65"
                  classList={{ "text-white/80": location.pathname === tab.href }}
                >
                  {tab.subtitle}
                </p>
              </A>
            )}
          </For>
        </div>

        <button
          type="button"
          onClick={props.onToggleDarkMode}
          class="rounded-xl border border-ink/15 bg-white/85 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink/35 dark:border-white/20 dark:bg-[#1b2a3e] dark:text-white"
          aria-label="Toggle dark mode"
        >
          {props.darkMode ? "Dark" : "Light"}
        </button>
      </div>
    </header>
  )
}

const App = () => {
  const location = useLocation()
  const [cycles, setCycles] = createPersistedSignal("zat.og.cycles", "0")
  const [darkMode, setDarkMode] = createPersistedSignal("ui.darkMode", false)

  createEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode())
  })

  return (
    <div class="relative min-h-screen overflow-hidden bg-mist text-ink transition-colors dark:bg-[#070d16] dark:text-[#e8f0ff]">
      <div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,rgba(255,107,53,0.2),transparent_50%),radial-gradient(circle_at_90%_10%,rgba(10,143,148,0.25),transparent_45%),radial-gradient(circle_at_40%_85%,rgba(12,28,48,0.18),transparent_40%)] dark:bg-[radial-gradient(circle_at_12%_20%,rgba(255,107,53,0.22),transparent_46%),radial-gradient(circle_at_84%_16%,rgba(10,143,148,0.24),transparent_42%),radial-gradient(circle_at_50%_82%,rgba(143,182,255,0.2),transparent_40%)]" />
      <TopNav darkMode={darkMode()} onToggleDarkMode={() => setDarkMode((value) => !value)} />
      <main class="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 sm:px-8 sm:pb-12 sm:pt-6 lg:px-10 lg:pb-14 lg:pt-8">
        <Switch fallback={<OgTechPage cycles={cycles()} setCycles={setCycles} />}>
          <Match when={location.pathname === "/"}>
            <OgTechPage cycles={cycles()} setCycles={setCycles} />
          </Match>
          <Match when={location.pathname === "/zat-guide"}>
            <ZatGuidePage cycles={cycles()} setCycles={setCycles} />
          </Match>
          <Match when={location.pathname === "/penrose"}>
            <PenrosePage cycles={cycles()} setCycles={setCycles} />
          </Match>
          <Match when={location.pathname === "/sc"}>
            <ScPage />
          </Match>
          <Match
            when={
              location.pathname === "/premium" ||
              location.pathname === "/premium/crystal-token" ||
              location.pathname === "/premium/crystal"
            }
          >
            <PremiumCrystalTokenPage />
          </Match>
          <Match when={location.pathname === "/premium/hauler-mine" || location.pathname === "/premium/hauler"}>
            <PremiumHaulerMinePage />
          </Match>
        </Switch>
      </main>
    </div>
  )
}

export default App
