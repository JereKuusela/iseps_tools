import { render } from "solid-js/web"
import { Router, Route } from "@solidjs/router"
import { ErrorBoundary, lazy } from "solid-js"
import App from "./App"
import { ROUTES } from "./lib/routes"
import { ScProvider } from "./pages/sc/scContext"
import { initCloudSync } from "./lib/cloudSync"
import { runStorageMigrations } from "./lib/storageMigrations"
import { HomePage } from "./pages/home/HomePage"
import { OgTechPage } from "./pages/ogTech/OgTechPage"
import { TokensPage } from "./pages/tokens/TokensPage"
import { CrystalsPage } from "./pages/crystals/CrystalsPage"
import { PerkGuidePage } from "./pages/perkGuide/PerkGuidePage"
import { TalentGuidePage } from "./pages/talentGuide/TalentGuidePage"
import { CruisePage } from "./pages/cruise/CruisePage"
import { FactoryPage } from "./pages/factory/FactoryPage"
import { FactoryProductionPage } from "./pages/factoryProduction/FactoryProductionPage"
import { ZatGuidePage } from "./pages/zatGuide/ZatGuidePage"
import { ScPage } from "./pages/sc/ScPage"
import { KaiperPage } from "./pages/kaiper/KaiperPage"
import { SettingsPage } from "./pages/settings/SettingsPage"
import { PremiumCrystalTokenPage } from "./pages/premium/PremiumCrystalTokenPage"
import { PremiumHaulerMinePage } from "./pages/premium/PremiumHaulerMinePage"
import "./index.css"

runStorageMigrations()
initCloudSync()

const pageRoutes = [
  { path: ROUTES.home, component: HomePage },
  { path: ROUTES.ogTech, component: OgTechPage },
  { path: ROUTES.tokens, component: TokensPage },
  { path: ROUTES.crystals, component: CrystalsPage },
  { path: ROUTES.perks, component: PerkGuidePage },
  { path: ROUTES.talents, component: TalentGuidePage },
  { path: ROUTES.cruise, component: CruisePage },
  { path: ROUTES.factory, component: FactoryPage },
  { path: ROUTES.factoryProduction, component: FactoryProductionPage },
  { path: ROUTES.zatGuide, component: ZatGuidePage },
  { path: ROUTES.sc, component: ScPage },
  { path: ROUTES.kaiper, component: KaiperPage },
  { path: ROUTES.settings, component: SettingsPage },
  { path: ROUTES.premiumCrystal, component: PremiumCrystalTokenPage },
  { path: ROUTES.premiumHauler, component: PremiumHaulerMinePage },
  ...(import.meta.env.DEV
    ? [{ path: "/dev/guide-notes", component: lazy(() => import("./pages/dev/GuideNotesPage")) }]
    : []),
  { path: "/*all", component: HomePage },
]

const CrashFallback = (props: { error: unknown }) => {
  console.error(props.error)
  return (
    <div class="grid min-h-screen place-items-center p-6 text-center">
      <div class="grid gap-3">
        <p class="text-lg font-semibold">Something went wrong.</p>
        <p class="text-sm opacity-70">{props.error instanceof Error ? props.error.message : String(props.error)}</p>
        <button
          type="button"
          class="mx-auto rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-orange-600"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    </div>
  )
}

render(
  () => (
    <ErrorBoundary fallback={(error) => <CrashFallback error={error} />}>
      <ScProvider>
        <Router root={App}>
          {pageRoutes.map((route) => (
            <Route path={route.path} component={route.component} />
          ))}
        </Router>
      </ScProvider>
    </ErrorBoundary>
  ),
  document.getElementById("root") as HTMLElement,
)
