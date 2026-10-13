import { describe, expect, it } from "vitest"
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
