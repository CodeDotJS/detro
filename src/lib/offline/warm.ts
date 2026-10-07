import { backgroundOrder } from "./precache"
import { SHELL_CACHE, SNAPSHOT_CACHE } from "./caches"

const WIDTH = 2

let started = false
let running = false

export function warmOffline(): void {
  if (started || !("caches" in window)) return
  started = true
  const run = () => {
    if (running) return
    running = true
    void fill().finally(() => {
      running = false
    })
  }
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 2000 })
  else globalThis.setTimeout(run, 1500)
  window.addEventListener("online", run)
}

async function fill(): Promise<void> {
  if (!navigator.onLine) return
  let list: { shell: string[]; snapshot: string[] }
  try {
    const response = await fetch("/precache.json")
    if (!response.ok) return
    const payload: unknown = await response.json()
    if (!isList(payload)) return
    list = payload
  } catch {
    return
  }
  const [shell, journeys, briefs, tiles] = backgroundOrder(list)
  const groups: Array<[string, string[]]> = [
    [SHELL_CACHE, shell],
    [SNAPSHOT_CACHE, journeys],
    [SNAPSHOT_CACHE, briefs],
    [SHELL_CACHE, tiles],
  ]
  await refreshShell(list.shell)
  for (const [name, urls] of groups) {
    if (!navigator.onLine) return
    await storeMissing(name, urls)
  }
}

const PAGES = ["/", "/index.html"]

async function refreshShell(current: string[]): Promise<void> {
  const cache = await caches.open(SHELL_CACHE)
  await Promise.all(PAGES.map((url) => storeOne(cache, url)))
  const keep = new Set(current)
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname
    if (path.startsWith("/assets/") && !keep.has(path)) await cache.delete(request)
  }
}

async function storeMissing(name: string, urls: string[]): Promise<void> {
  const cache = await caches.open(name)
  const saved = new Set((await cache.keys()).map((request) => new URL(request.url).pathname))
  const pending = urls.filter((url) => !saved.has(url))
  let next = 0
  async function worker(): Promise<void> {
    while (next < pending.length && navigator.onLine) {
      const url = pending[next]
      next += 1
      await storeOne(cache, url)
    }
  }
  const workers = Math.min(WIDTH, pending.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
}

async function storeOne(cache: Cache, url: string): Promise<void> {
  try {
    const response = await fetch(url, { priority: "low" })
    if (!response.ok) return
    await cache.put(url, response)
  } catch {
    // The next visit continues from the files already saved.
  }
}

function isList(value: unknown): value is { shell: string[]; snapshot: string[] } {
  if (!value || typeof value !== "object") return false
  const list = value as { shell?: unknown; snapshot?: unknown }
  return Array.isArray(list.shell) && Array.isArray(list.snapshot) && list.shell.every(isPath) && list.snapshot.every(isPath)
}

function isPath(value: unknown): value is string {
  return typeof value === "string"
}
