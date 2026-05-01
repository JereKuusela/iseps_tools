import { render } from "solid-js/web";
import { Route, Router } from "@solidjs/router";
import App from "./App";
import { ZatDataProvider } from "./lib/zat-data-context";
import "./index.css";

render(
  () => (
    <ZatDataProvider>
      <Router>
        <Route path="/*all" component={App} />
      </Router>
    </ZatDataProvider>
  ),
  document.getElementById("root") as HTMLElement,
);
