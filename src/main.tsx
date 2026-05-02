import { render } from "solid-js/web"
import { Route, Router } from "@solidjs/router"
import App from "./App"
import { ScProvider } from "./lib/scContext"
import { ZatDataProvider } from "./lib/zatContext"
import "./index.css"

render(
  () => (
    <ZatDataProvider>
      <ScProvider>
        <Router>
          <Route path="/*all" component={App} />
        </Router>
      </ScProvider>
    </ZatDataProvider>
  ),
  document.getElementById("root") as HTMLElement,
)
