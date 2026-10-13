import { describe, expect, it } from "vitest"
import { readPack, statusClock, statusStamp12, statusTime12 } from "./load"

describe("status pack file", () => {
  it("reads closed stations and treats a broken file as empty", () => {
    const pack = readPack({
      fetchedAt: "2026-10-10T08:00:00.000",
      serviceUpdate: {
        title: "SERVICE UPDATE",
        text: "Gates closed at Rajiv Chowk.",
        dated: "10.10.2026",
        fetchedAt: "2026-10-10T08:00:00.000",
      },
      stations: {
        RCK: { phrase: "Station Closed", note: "Stay on the train.", lineCodes: ["LN2"] },
      },
    })
    expect(pack.stations.RCK.phrase).toBe("Station Closed")
    expect(pack.serviceUpdate?.dated).toBe("10.10.2026")
    expect(statusClock(pack.fetchedAt)).toBe("2026-10-10 08:00:00")
    expect(statusTime12(pack.fetchedAt)).toBe("8:00 AM")
    expect(statusTime12("2026-10-13T14:30:00.000")).toBe("2:30 PM")
    expect(statusTime12("2026-10-13T00:05:00.000")).toBe("12:05 AM")
    expect(statusStamp12("2026-10-13T14:30:00.000")).toBe("2026-10-13 2:30 PM")
    expect(readPack(null)).toEqual({ fetchedAt: "", stations: {} })
  })
})
