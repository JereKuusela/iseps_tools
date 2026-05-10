import { render } from "solid-js/web"
import { Router, Route } from "@solidjs/router"
import App from "./App"
import { ROUTES } from "./lib/routes"
import { ScProvider } from "./lib/scContext"
import { CreditsPage } from "./pages/CreditsPage"
import { HomePage } from "./pages/HomePage"
import { OgTechPage } from "./pages/og/OgTechPage"
import { PenrosePage } from "./pages/penrose/PenrosePage"
import { PremiumCrystalTokenPage, PremiumHaulerMinePage } from "./pages/PremiumPage"
import { ScPage } from "./pages/sc/ScPage"
import { ZatGuidePage } from "./pages/zatGuide/ZatGuidePage"
import "./index.css"

const HomeRoute = () => (
  <App>
    <HomePage />
  </App>
)

const OgTechRoute = () => (
  <App>
    <OgTechPage />
  </App>
)

const ZatGuideRoute = () => (
  <App>
    <ZatGuidePage />
  </App>
)

const PenroseRoute = () => (
  <App>
    <PenrosePage />
  </App>
)

const ScRoute = () => (
  <App>
    <ScPage />
  </App>
)

const CreditsRoute = () => (
  <App>
    <CreditsPage />
  </App>
)

const PremiumCrystalRoute = () => (
  <App>
    <PremiumCrystalTokenPage />
  </App>
)

const PremiumHaulerRoute = () => (
  <App>
    <PremiumHaulerMinePage />
  </App>
)

render(
  () => (
    <ScProvider>
      <Router>
        <Route path={ROUTES.home} component={HomeRoute} />
        <Route path={ROUTES.ogTech} component={OgTechRoute} />
        <Route path={ROUTES.zatGuide} component={ZatGuideRoute} />
        <Route path={ROUTES.penrose} component={PenroseRoute} />
        <Route path={ROUTES.sc} component={ScRoute} />
        <Route path={ROUTES.credits} component={CreditsRoute} />
        <Route path={ROUTES.premiumCrystal} component={PremiumCrystalRoute} />
        <Route path={ROUTES.premiumHauler} component={PremiumHaulerRoute} />
        <Route path="/*all" component={HomeRoute} />
      </Router>
    </ScProvider>
  ),
  document.getElementById("root") as HTMLElement,
)
