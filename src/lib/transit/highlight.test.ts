import { describe, expect, it } from "vitest"
import routeRiKg from "../../../tests/fixtures/dmrc/route-ri-kg.json"
import { normalizeJourney } from "../dmrc/normalize"
import { bestLineForCodes, codesOnMap, journeyStationCodes } from "./highlight"
import type { LineSequence } from "./route"

describe("route highlighting", () => {
  it("keeps map-path codes from a saved journey and drops unknown ones", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30")
    if (!result.ok) throw new Error("expected journey")
    const codes = journeyStationCodes(result.journey)
    expect(codes[0]).toBe("RI")
    expect(codes.at(-1)).toBe("KG")
    expect(codesOnMap([...codes, "NOPE"], new Set(["RI", "KG"]))).toEqual(["RI", "KG"])
  })

  it("opens the line that contains the route", () => {
    const lines = [
      { code: "LN2", show: true, stations: [{ code: "RCK" }] },
      { code: "LN1", show: true, stations: [{ code: "RI" }, { code: "KG" }] },
    ] as LineSequence[]
    expect(bestLineForCodes(lines, ["RI", "KG", "RCK"], "LN1")).toBe("LN1")
  })
})
