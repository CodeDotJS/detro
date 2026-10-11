import { describe, expect, it } from "vitest"
import { readPack, statusClock } from "./load"

describe("status pack file", () => {
  it("reads closed stations and treats a broken file as empty", () => {
    const pack = readPack({
      fetchedAt: "2026-10-10T08:00:00.000",
      stations: {
        RCK: { phrase: "Station Closed", note: "Stay on the train.", lineCodes: ["LN2"] },
      },
    })
    expect(pack.stations.RCK.phrase).toBe("Station Closed")
    expect(statusClock(pack.fetchedAt)).toBe("2026-10-10 08:00:00")
    expect(readPack(null)).toEqual({ fetchedAt: "", stations: {} })
  })
})
