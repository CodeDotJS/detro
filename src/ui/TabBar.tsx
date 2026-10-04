import { pathForTab } from "../lib/nav"
import type { Copy } from "../i18n/copy"

export type Tab = "plan" | "map" | "city" | "help"

export function TabBar({
  copy,
  tab,
  online,
  onTab,
}: {
  copy: Copy
  tab: Tab
  online: boolean
  onTab: (tab: Tab) => void
}) {
  const items: Array<{ id: Tab; label: string }> = [
    { id: "plan", label: copy.plan },
    { id: "map", label: copy.map },
    { id: "city", label: copy.cityMap },
    { id: "help", label: copy.help },
  ]
  return (
    <nav className="tabbar" aria-label={copy.navLabel}>
      {items.map((item) => (
        <a
          key={item.id}
          href={pathForTab(item.id)}
          aria-current={tab === item.id ? "page" : undefined}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
            event.preventDefault()
            onTab(item.id)
          }}
        >
          <TabIcon name={item.id} />
          {item.label}
          {item.id === "help" ? <SignalMark online={online} /> : null}
        </a>
      ))}
    </nav>
  )
}

function SignalMark({ online }: { online: boolean }) {
  return (
    <span className="signal" title={online ? "Online" : "Offline"}>
      <svg viewBox="0 0 24 24" className="signal-mark" aria-hidden="true">
        <path d="M12 22v-6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 22h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 15.5 8.4 18M12 15.5 15.6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7.2 11.4a6.4 6.4 0 0 1 9.6 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M4.4 8.2a10.2 10.2 0 0 1 15.2 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity={online ? 1 : 0.28}
        />
        {online ? null : <path d="M5 5.5 19 19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
      </svg>
      <span className="sr-only">{online ? "Online" : "Offline"}</span>
    </span>
  )
}

function TabIcon({ name }: { name: Tab }) {
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
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="tab-icon">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v6M12 8h.01" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
