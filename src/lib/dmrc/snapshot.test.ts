import { describe, expect, it } from "vitest"
import { buildCatalog, loadSnapshot, searchCatalog } from "./snapshot"

describe("saved station snapshot", () => {
  const snapshot = loadSnapshot()

  it("loads the downloaded line and station lists", () => {
    expect(snapshot.fetchedAt.startsWith("2026-09-30")).toBe(true)
    expect(snapshot.stations.length).toBeGreaterThan(100)
  })

  it("finds a station from its code", () => {
    expect(searchCatalog(snapshot.stations, "en", "GNPK")[0]).toMatchObject({
      code: "GNPK",
      name: "GREEN PARK",
    })
    expect(searchCatalog(snapshot.stations, "en", "gnpk")[0].code).toBe("GNPK")
  })

  it("finds Rithala on the Red Line without calling the network", () => {
    const matches = searchCatalog(snapshot.stations, "en", "rith")
    expect(matches[0]).toMatchObject({
      code: "RI",
      name: "RITHALA",
    })
    expect(matches[0].lines).toEqual([
      expect.objectContaining({ code: "LN1", colorName: "Red Line", color: "#c0282c" }),
    ])
  })

  it("keeps every visible line for an interchange", () => {
    const kashmere = searchCatalog(snapshot.stations, "en", "kashmere")
    expect(kashmere[0].code).toBe("KG")
    expect(kashmere[0].lines.map((line) => line.code).sort()).toEqual(["LN1", "LN2", "LN6"])
  })

  it("leaves out lines the official list does not show", () => {
    const hidden = buildCatalog({
      enLines: [{ line_code: "LN12", name: "FOB", line_color: "FOB", primary_color_code: "#808080", show_in_frontend: false }],
      hiLines: [],
      enStations: [
        {
          lineCode: "LN12",
          payload: [{ station_code: "DK", station_name: "DHAULA KUAN" }],
        },
      ],
      hiStations: [],
    })
    expect(searchCatalog(hidden, "en", "dhaula")).toEqual([])
  })
})
