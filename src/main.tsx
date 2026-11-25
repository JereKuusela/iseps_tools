import { render } from "solid-js/web"
import { Router, Route } from "@solidjs/router"
import { ErrorBoundary, lazy, type Component } from "solid-js"
import App from "./App"
import { ROUTES } from "./lib/routes"
import { ScProvider } from "./pages/sc/scContext"
import { initCloudSync } from "./lib/cloudSync"
import "./index.css"

initCloudSync()

const page = <K extends string>(load: () => Promise<Record<K, Component>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })))

const HomePage = page(() => import("./pages/home/HomePage"), "HomePage")

const pageRoutes = [
  { path: ROUTES.home, component: HomePage },
  { path: ROUTES.ogTech, component: page(() => import("./pages/ogTech/OgTechPage"), "OgTechPage") },
  { path: ROUTES.tokens, component: page(() => import("./pages/tokens/TokensPage"), "TokensPage") },
  { path: ROUTES.crystals, component: page(() => import("./pages/crystals/CrystalsPage"), "CrystalsPage") },
  { path: ROUTES.perks, component: page(() => import("./pages/perkGuide/PerkGuidePage"), "PerkGuidePage") },
  {
    path: ROUTES.talents,
    component: page(() => import("./pages/talentGuide/TalentGuidePage"), "TalentGuidePage"),
  },
  { path: ROUTES.cruise, component: page(() => import("./pages/cruise/CruisePage"), "CruisePage") },
  { path: ROUTES.factory, component: page(() => import("./pages/factory/FactoryPage"), "FactoryPage") },
  {
    path: ROUTES.factoryProduction,
    component: page(() => import("./pages/factoryProduction/FactoryProductionPage"), "FactoryProductionPage"),
  },
  { path: ROUTES.zatGuide, component: page(() => import("./pages/zatGuide/ZatGuidePage"), "ZatGuidePage") },
  { path: ROUTES.sc, component: page(() => import("./pages/sc/ScPage"), "ScPage") },
  { path: ROUTES.settings, component: page(() => import("./pages/settings/SettingsPage"), "SettingsPage") },
  {
    path: ROUTES.premiumCrystal,
    component: page(() => import("./pages/premium/PremiumCrystalTokenPage"), "PremiumCrystalTokenPage"),
  },
  {
    path: ROUTES.premiumHauler,
    component: page(() => import("./pages/premium/PremiumHaulerMinePage"), "PremiumHaulerMinePage"),
  },
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
