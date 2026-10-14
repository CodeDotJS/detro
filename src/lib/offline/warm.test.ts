import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Stored = Map<string, Response>

function memoryCaches() {
  const bags = new Map<string, Stored>()

  class MemoryCache {
    constructor(private readonly bag: Stored) {}
    async put(request: RequestInfo, response: Response) {
      const url = typeof request === "string" ? request : request.url
      this.bag.set(new URL(url, "http://localhost").pathname, response)
    }
    async match(request: RequestInfo) {
      const url = typeof request === "string" ? request : request.url
      return this.bag.get(new URL(url, "http://localhost").pathname)
    }
    async keys() {
      return [...this.bag.keys()].map((path) => new Request(`http://localhost${path}`))
    }
    async delete(request: RequestInfo) {
      const url = typeof request === "string" ? request : request.url
      return this.bag.delete(new URL(url, "http://localhost").pathname)
    }
  }

  return {
    async open(name: string) {
      let bag = bags.get(name)
      if (!bag) {
        bag = new Map()
        bags.set(name, bag)
      }
      return new MemoryCache(bag)
    },
    bags,
  }
}

describe("warmOffline first-load phases", () => {
  let idleCallbacks: Array<() => void>
  let fetchMock: ReturnType<typeof vi.fn>
  let cachesApi: ReturnType<typeof memoryCaches>

  beforeEach(() => {
    idleCallbacks = []
    cachesApi = memoryCaches()
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      const path = new URL(url, "http://localhost").pathname
      if (path === "/precache.json") {
        return new Response(
          JSON.stringify({
            shell: ["/", "/index.html", "/assets/app.js", "/icons/icon-192.png", "/map-tiles/9/1/1.png"],
            snapshot: ["/snapshot/en/journeys/RI.json", "/snapshot/en/station_brief/RI.json"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }
      return new Response(`body:${path}`, {
        status: 200,
        headers: { "Content-Type": "text/plain", "X-Priority": String(init?.priority ?? "auto") },
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("caches", cachesApi)
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: undefined })
    vi.stubGlobal("window", {
      ...globalThis,
      requestIdleCallback: (cb: IdleRequestCallback) => {
        idleCallbacks.push(() => cb({ didTimeout: false, timeRemaining: () => 50 }))
        return 1
      },
      addEventListener: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("caches the shell before idle, and journeys only after idle", async () => {
    const { warmOffline } = await import("./warm")
    warmOffline()

    await vi.waitFor(() => {
      const paths = fetchMock.mock.calls.map((call) => new URL(String(call[0]), "http://localhost").pathname)
      expect(paths).toContain("/assets/app.js")
      expect(paths).toContain("/icons/icon-192.png")
    })

    await vi.waitFor(() => expect(idleCallbacks.length).toBeGreaterThan(0))

    const beforeIdle = fetchMock.mock.calls.map((call) => new URL(String(call[0]), "http://localhost").pathname)
    expect(beforeIdle).not.toContain("/snapshot/en/journeys/RI.json")
    expect(beforeIdle).not.toContain("/map-tiles/9/1/1.png")
    expect(beforeIdle).not.toContain("/snapshot/en/station_brief/RI.json")

    for (const run of idleCallbacks.splice(0)) run()

    await vi.waitFor(() => {
      const paths = fetchMock.mock.calls.map((call) => new URL(String(call[0]), "http://localhost").pathname)
      expect(paths).toContain("/snapshot/en/journeys/RI.json")
      expect(paths).toContain("/map-tiles/9/1/1.png")
    })

    const all = fetchMock.mock.calls.map((call) => new URL(String(call[0]), "http://localhost").pathname)
    expect(all).not.toContain("/snapshot/en/station_brief/RI.json")

    const journeyCall = fetchMock.mock.calls.find(
      (call) => new URL(String(call[0]), "http://localhost").pathname === "/snapshot/en/journeys/RI.json",
    )
    expect(journeyCall?.[1]).toMatchObject({ priority: "low" })
  })

  it("does not wait on idle before saving the shell", async () => {
    const { warmOffline } = await import("./warm")
    warmOffline()
    expect(idleCallbacks).toHaveLength(0)

    await vi.waitFor(() => {
      const paths = fetchMock.mock.calls.map((call) => new URL(String(call[0]), "http://localhost").pathname)
      expect(paths).toContain("/precache.json")
      expect(paths).toContain("/assets/app.js")
    })

    const paths = fetchMock.mock.calls.map((call) => new URL(String(call[0]), "http://localhost").pathname)
    expect(paths).not.toContain("/snapshot/en/journeys/RI.json")
  })
})
