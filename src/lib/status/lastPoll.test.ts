import { afterEach, describe, expect, it, vi } from "vitest"
import { readLastPollPayload } from "./lastPoll"

describe("last poll payload", () => {
  it("reads polledAt", () => {
    expect(readLastPollPayload({ polledAt: "2026-10-13T14:00:00.000" })).toBe("2026-10-13T14:00:00.000")
  })

  it("rejects empty or missing", () => {
    expect(readLastPollPayload({ polledAt: null })).toBeNull()
    expect(readLastPollPayload({})).toBeNull()
    expect(readLastPollPayload(null)).toBeNull()
  })
})

describe("loadLastPoll session cache", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("hits the network only once per module session", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ polledAt: "2026-10-13T14:00:00.000" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const mod = await import("./lastPoll")
    await expect(mod.loadLastPoll()).resolves.toBe("2026-10-13T14:00:00.000")
    await expect(mod.loadLastPoll()).resolves.toBe("2026-10-13T14:00:00.000")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
