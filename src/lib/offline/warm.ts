import { backgroundOrder } from "./precache"
import { SHELL_CACHE, SNAPSHOT_CACHE } from "./caches"

const SHELL_WIDTH = 4
const HEAVY_WIDTH = 2

let started = false
let running = false
let again = false

export function warmOffline(): void {
  if (started || !("caches" in globalThis)) return
  started = true
  void warm()
  window.addEventListener("online", () => {
    void warm()
  })
}

async function warm(): Promise<void> {
  if (running) {
    again = true
    return
  }
  running = true
  try {
    do {
      again = false
      await fill()
    } while (again && navigator.onLine)
  } finally {
    running = false
  }
}

async function fill(): Promise<void> {
  if (!navigator.onLine) return
  const list = await loadPrecache()
  if (!list) return

  const { shell, journeys, tiles } = backgroundOrder(list)
  await refreshShell(list.shell)
  if (!navigator.onLine) return
  await storeMissing(SHELL_CACHE, shell, { width: SHELL_WIDTH })

  if (!navigator.onLine) return
  await whenIdle()
  if (!navigator.onLine) return

  await storeMissing(SNAPSHOT_CACHE, journeys, { width: HEAVY_WIDTH, priority: "low" })
  if (!navigator.onLine) return
  await storeMissing(SHELL_CACHE, tiles, { width: HEAVY_WIDTH, priority: "low" })
}

async function loadPrecache(): Promise<{ shell: string[]; snapshot: string[] } | null> {
  try {
    const response = await fetch("/precache.json")
    if (!response.ok) return null
    const payload: unknown = await response.json()
    return isList(payload) ? payload : null
  } catch {
    return null
  }
}

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 2000 })
      return
    }
    globalThis.setTimeout(resolve, 1500)
  })
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

async function storeMissing(
  name: string,
  urls: string[],
  options: { width: number; priority?: RequestPriority },
): Promise<void> {
  const cache = await caches.open(name)
  const saved = new Set((await cache.keys()).map((request) => new URL(request.url).pathname))
  const pending = urls.filter((url) => !saved.has(url))
  let next = 0
  async function worker(): Promise<void> {
    while (next < pending.length && navigator.onLine) {
      const url = pending[next]
      next += 1
      await storeOne(cache, url, options.priority)
    }
  }
  const workers = Math.min(options.width, pending.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
}

async function storeOne(cache: Cache, url: string, priority?: RequestPriority): Promise<void> {
  try {
    const response = await fetch(url, priority ? { priority } : undefined)
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
