import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "next-themes"
import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/600.css"
import { App } from "./App"
import { defaultTheme, themeStorageKey, themes } from "./lib/plan/theme"
import { warmOffline } from "./lib/offline/warm"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("Missing root element")

createRoot(root).render(
  <StrictMode>
    <ThemeProvider
      attribute="data-theme"
      defaultTheme={defaultTheme}
      enableSystem={false}
      enableColorScheme={false}
      storageKey={themeStorageKey}
      themes={[...themes]}
      disableTransitionOnChange
    >
      <App />
    </ThemeProvider>
  </StrictMode>,
)

if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js")
warmOffline()
