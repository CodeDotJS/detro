import { describe, expect, it } from "vitest"
import { accessFor } from "./classify"
import { accessByCode, packStatus } from "./pack"

const metro = [
  { line_code: "LN2", status: "Normal Service", note: "" },
  {
    stations_updates: [
      {
        station: { station_code: "RCK", station_name: "RAJIV CHOWK" },
        partial_service: false,
        start_date: "09-Oct-2026 09:00PM",
        end_date: "10-Oct-2026 11:59PM",
        title: "Service Update",
        note: "However, Interchange facility is available at Rajiv Chowk .",
        activate: true,
      },
      {
        station: { station_code: "NDI", station_name: "NEW DELHI" },
        partial_service: false,
        start_date: "09-Oct-2026 09:00PM",
        end_date: "10-Oct-2026 11:59PM",
        title: "Service Update",
        note: "The interchange facility at New Delhi Metro station will not be available till further notice.",
        activate: true,
      },
    ],
    line_updates: [],
  },
]

const linepage = [
  { station_code: "SPBI", station_name: "SAMAYPUR BADLI", status: "Station Open" },
  { station_code: "RCK", station_name: "RAJIV CHOWK", status: "Station Closed" },
  { station_code: "NDI", station_name: "NEW DELHI", status: "Station Closed" },
  { station_partial_open_count: 0, station_closed_count: 2, station_open_count: 1 },
]

describe("status pack", () => {
  it("keeps closed stations and drops open ones", () => {
    const pack = packStatus("2026-10-10T08:00:00.000", [{ code: "LN2", metro, linepage }])
    expect(pack.fetchedAt).toBe("2026-10-10T08:00:00.000")
    expect(pack.stations.SPBI).toBeUndefined()
    expect(pack.stations.RCK.phrase).toBe("Station Closed")
    expect(pack.stations.RCK.lineCodes).toEqual(["LN2"])
    expect(pack.stations.RCK.note).toContain("Interchange facility is available")
    expect(accessFor(pack.stations.RCK.phrase, pack.stations.RCK.note).transfer).toBe(true)
    expect(accessFor(pack.stations.NDI.phrase, pack.stations.NDI.note).transfer).toBe(false)
  })

  it("treats a missing code as open", () => {
    const pack = packStatus("2026-10-10T08:00:00.000", [{ code: "LN2", metro, linepage }])
    expect(accessByCode(pack, "SPBI")).toEqual({ board: true, alight: true, transfer: true, pass: true })
    expect(accessByCode(pack, "RCK").board).toBe(false)
  })
})
