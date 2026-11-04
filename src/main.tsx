import { render } from "solid-js/web"
import { Router, Route } from "@solidjs/router"
import App from "./App"
import { ROUTES } from "./lib/routes"
import { ScProvider } from "./pages/sc/scContext"
import { CrystalsPage } from "./pages/crystals/CrystalsPage"
import { CruisePage } from "./pages/cruise/CruisePage"
import { FactoryPage } from "./pages/factory/FactoryPage"
import { FactoryProductionPage } from "./pages/factoryProduction/FactoryProductionPage"
import { HomePage } from "./pages/home/HomePage"
import { OgTechPage } from "./pages/ogTech/OgTechPage"
import { PerkGuidePage } from "./pages/perkGuide/PerkGuidePage"
import { PremiumCrystalTokenPage } from "./pages/premium/PremiumCrystalTokenPage"
import { PremiumHaulerMinePage } from "./pages/premium/PremiumHaulerMinePage"
import { ScPage } from "./pages/sc/ScPage"
import { SettingsPage } from "./pages/settings/SettingsPage"
import { TalentGuidePage } from "./pages/talentGuide/TalentGuidePage"
import { TokensPage } from "./pages/tokens/TokensPage"
import { ZatGuidePage } from "./pages/zatGuide/ZatGuidePage"
import { initCloudSync } from "./lib/cloudSync"
import { migrateCrystalSharedInputs } from "./shared/crystalSharedInputs"
import { migrateTokenSharedInputs } from "./shared/tokenSharedInputs"
import "./index.css"

migrateTokenSharedInputs()
migrateCrystalSharedInputs()
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
  { path: ROUTES.settings, component: SettingsPage },
  { path: ROUTES.premiumCrystal, component: PremiumCrystalTokenPage },
  { path: ROUTES.premiumHauler, component: PremiumHaulerMinePage },
  { path: "/*all", component: HomePage },
]

render(
  () => (
    <ScProvider>
      <Router root={App}>
        {pageRoutes.map((route) => (
          <Route path={route.path} component={route.component} />
        ))}
      </Router>
    </ScProvider>
  ),
  document.getElementById("root") as HTMLElement,
)
