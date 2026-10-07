import { useEffect, useState } from "react"
import { Wifi, WifiOff } from "lucide-react"
import { pathForTab } from "../lib/nav"
import type { Copy } from "../i18n/copy"
import { playCopy } from "../i18n/play"

export type Tab = "plan" | "map" | "city" | "saved" | "play" | "help"

export function TabBar({
  copy,
  tab,
  onTab,
  savedLand = 0,
  savedCount = 0,
}: {
  copy: Copy
  tab: Tab
  onTab: (tab: Tab) => void
  /** Bumps each time a trip is saved, so the Saved tab can catch it. */
  savedLand?: number
  savedCount?: number
}) {
  const [landing, setLanding] = useState(false)
  useEffect(() => {
    if (savedLand === 0) return
    setLanding(true)
    const id = window.setTimeout(() => setLanding(false), 1100)
    return () => window.clearTimeout(id)
  }, [savedLand])
  const items: Array<{ id: Tab; label: string }> = [
    { id: "plan", label: copy.plan },
    { id: "map", label: copy.map },
    { id: "city", label: copy.cityMap },
    { id: "saved", label: copy.saved },
    { id: "play", label: playCopy.tab },
    { id: "help", label: copy.help },
  ]
  return (
    <nav className="tabbar" aria-label={copy.navLabel}>
      {items.map((item) => (
        <a
          key={item.id}
          href={pathForTab(item.id)}
          className={item.id === "saved" && landing ? "tab-land" : undefined}
          aria-current={tab === item.id ? "page" : undefined}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
            event.preventDefault()
            onTab(item.id)
          }}
        >
          <span className="tab-icon-wrap">
            <TabIcon name={item.id} landing={item.id === "saved" && landing} />
            {item.id === "saved" && landing && savedCount > 0 ? (
              <span className="tab-saved-pip" aria-hidden="true">
                {savedCount}
              </span>
            ) : null}
          </span>
          {item.label}
        </a>
      ))}
    </nav>
  )
}

export function SignalMark({ copy, online }: { copy: Copy; online: boolean }) {
  const label = online ? copy.onlineStatus : copy.offlineStatus
  return (
    <span className={online ? "signal signal-on" : "signal signal-off"} role="status">
      {online ? (
        <Wifi aria-hidden="true" size={18} strokeWidth={2.25} />
      ) : (
        <WifiOff aria-hidden="true" size={18} strokeWidth={2.25} />
      )}
      <span className="signal-label">{label}</span>
    </span>
  )
}

function TabIcon({ name, landing = false }: { name: Tab; landing?: boolean }) {
  if (name === "plan") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="tab-icon">
        <path d="M5 6h14M5 12h14M5 18h9" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (name === "map") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="tab-icon">
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (name === "city") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="tab-icon">
        <path d="M4 19V9l8-5 8 5v10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9 19v-6h6v6" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (name === "saved") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={landing ? "tab-icon tab-icon-land" : "tab-icon"}>
        <path
          className="tab-saved-shape"
          d="M7 5h10v15l-5-3.2L7 20V5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (name === "play") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="tab-icon">
        <circle cx="7" cy="12" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="12" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9.2 12h5.6" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="tab-icon">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v6M12 8h.01" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
