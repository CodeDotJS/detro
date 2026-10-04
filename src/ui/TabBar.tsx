import { pathForTab } from "../lib/nav"
import type { Copy } from "../i18n/copy"

export type Tab = "plan" | "map" | "city" | "help"

export function TabBar({ copy, tab, onTab }: { copy: Copy; tab: Tab; onTab: (tab: Tab) => void }) {
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
        </a>
      ))}
    </nav>
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
