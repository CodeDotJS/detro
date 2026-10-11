import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "./lib/plan/theme-context"
import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/600.css"
import { App } from "./App"
import { warmOffline } from "./lib/offline/warm"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("Missing root element")

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js")
warmOffline()
