import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource/ibm-plex-sans/400.css"
import "@fontsource/ibm-plex-sans/600.css"
import { App } from "./App"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("Missing root element")

void openWhenReady().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

async function openWhenReady() {
  if (!("serviceWorker" in navigator)) return
  let registration: ServiceWorkerRegistration
  try {
    registration = await navigator.serviceWorker.register("/sw.js")
  } catch {
    return
  }
  if (navigator.serviceWorker.controller) return
  const worker = registration.installing || registration.waiting
  if (!worker) return
  await new Promise<void>((resolve) => {
    const finish = () => resolve()
    const timer = window.setTimeout(finish, 120000)
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        window.clearTimeout(timer)
        finish()
      }
    })
  })
}
