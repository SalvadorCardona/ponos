// First, before any resource is declared: the views need their router and
// their dialect in place by the time `createViewResource` runs.
import "./lib/resource-view"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import { SetupApp } from "./components/console/setup"
import "./index.css"

/* The server marks the page `data-setup` when what it serves is the first
 * connection rather than the console — see `web/server.py` and `setup.tsx`. */
const setup = Boolean(document.documentElement.dataset.setup)

createRoot(document.getElementById("root")!).render(
  <StrictMode>{setup ? <SetupApp /> : <App />}</StrictMode>
)
