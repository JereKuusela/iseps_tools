import { A, useLocation } from "@solidjs/router"
import { For, Match, Switch } from "solid-js"
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

function TopNav() {
  const location = useLocation()

  return (
    <header class="relative z-10 px-4 pt-5 sm:px-8 sm:pt-8 lg:px-10">
      <div class="mx-auto grid w-full max-w-6xl gap-2.5 rounded-2xl border border-white/60 bg-white/70 p-2.5 shadow-glow backdrop-blur sm:grid-cols-2 sm:gap-3 sm:p-3 lg:grid-cols-6">
        <For each={tabs}>
          {(tab) => (
            <A
              href={tab.href}
              class="rounded-xl px-4 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-ink hover:text-white"
              classList={{
                "bg-ink text-white": location.pathname === tab.href,
              }}
            >
              <p class="text-sm font-semibold tracking-wide">{tab.label}</p>
              <p class="text-xs text-ink/65" classList={{ "text-white/80": location.pathname === tab.href }}>
                {tab.subtitle}
              </p>
            </A>
          )}
        </For>
      </div>
    </header>
  )
}

export default function App() {
  const location = useLocation()
  const [cycles, setCycles] = createPersistedSignal("zat.og.cycles", "0")

  return (
    <div class="relative min-h-screen overflow-hidden bg-mist text-ink">
      <div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_20%,rgba(255,107,53,0.2),transparent_50%),radial-gradient(circle_at_90%_10%,rgba(10,143,148,0.25),transparent_45%),radial-gradient(circle_at_40%_85%,rgba(12,28,48,0.18),transparent_40%)]" />
      <TopNav />
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
