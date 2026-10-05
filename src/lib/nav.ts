import type { Tab } from "../ui/TabBar"

export function tabFromPath(pathname: string): Tab | null {
  const path = pathname.replace(/\/+$/, "") || "/"
  if (path === "/") return "plan"
  if (path === "/map") return "map"
  if (path === "/city") return "city"
  if (path === "/saved") return "saved"
  if (path === "/help") return "help"
  return null
}

export function pathForTab(tab: Tab): string {
  if (tab === "plan") return "/"
  return `/${tab}`
}
