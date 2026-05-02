import { render } from "solid-js/web"
import { Route, Router } from "@solidjs/router"
import App from "./App"
import { ROUTES } from "./lib/routes"
import { createPersistedSignal } from "./lib/persistedSignal"
import { ScProvider } from "./lib/scContext"
import { ZatDataProvider } from "./lib/zatContext"
import { CreditsPage } from "./pages/CreditsPage"
import { HomePage } from "./pages/HomePage"
import { OgTechPage } from "./pages/OgTechPage"
import { PenrosePage } from "./pages/PenrosePage"
import { PremiumCrystalTokenPage, PremiumHaulerMinePage } from "./pages/PremiumPage"
import { ScPage } from "./pages/ScPage"
import { ZatGuidePage } from "./pages/ZatGuidePage"
import "./index.css"

const HomeRoute = () => (
  <App>
    <HomePage />
  </App>
)

const OgTechRoute = () => {
  const [cycles, setCycles] = createPersistedSignal("zat.og.cycles", "0")
  return (
    <App>
      <OgTechPage cycles={cycles()} setCycles={setCycles} />
    </App>
  )
}

const ZatGuideRoute = () => {
  const [cycles, setCycles] = createPersistedSignal("zat.og.cycles", "0")
  return (
    <App>
      <ZatGuidePage cycles={cycles()} setCycles={setCycles} />
    </App>
  )
}

const PenroseRoute = () => {
  const [cycles, setCycles] = createPersistedSignal("zat.og.cycles", "0")
  return (
    <App>
      <PenrosePage cycles={cycles()} setCycles={setCycles} />
    </App>
  )
}

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
    <ZatDataProvider>
      <ScProvider>
        <Router base="iseps_tools">
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
    </ZatDataProvider>
  ),
  document.getElementById("root") as HTMLElement,
)
