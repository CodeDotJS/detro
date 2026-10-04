import { describe, expect, it } from "vitest"
import brief from "../../../data/en/station_brief/HDNR.json"
import { parseStationBrief } from "./brief"
import { stationBrief } from "./briefs"
import { createPlanState, planReducer } from "../plan/state"

describe("station brief", () => {
  it("reads Hindon River facilities and leaves gates unverified", () => {
    const parsed = parseStationBrief(brief)
    expect(parsed?.code).toBe("HDNR")
    expect(parsed?.name).toBe("HINDON RIVER")
    expect(parsed?.facilities).toContain("Parking Available")
    expect(parsed?.lifts.some((lift) => lift.name === "Escalator No. 5")).toBe(true)
    expect(parsed?.gateCodes).toEqual([])
    expect(stationBrief("HDNR")?.facilities).toContain("Parking Available")
    expect(stationBrief("WC")?.name).toBe("WELCOME")
  })
})

describe("map station picks", () => {
  it("sets a destination from the map without a search list", () => {
    const next = planReducer(createPlanState(), {
      type: "set-station",
      field: "to",
      pick: { code: "KG", name: "KASHMERE GATE" },
    })
    expect(next.to).toEqual({ code: "KG", name: "KASHMERE GATE" })
    expect(next.toQuery).toBe("KASHMERE GATE")
  })
})
