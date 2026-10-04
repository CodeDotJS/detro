import { describe, expect, it } from "vitest"
import routeRiKg from "../../../tests/fixtures/dmrc/route-ri-kg.json"
import routeRiRck from "../../../tests/fixtures/dmrc/route-ri-rck.json"
import { normalizeJourney } from "../dmrc/normalize"
import type { LineSequence } from "./route"
import { routeStops, startLineCode } from "./routeMap"

const red: LineSequence = {
  code: "LN1",
  show: true,
  label: {
    en: { name: "Line 1", colorName: "Red Line", color: "#c0282c" },
    hi: { name: "Line 1", colorName: "Red Line", color: "#c0282c" },
  },
  stations: [],
}

const yellow: LineSequence = {
  ...red,
  code: "LN2",
  label: {
    en: { name: "Line 2", colorName: "Yellow Line", color: "#f6d71a" },
    hi: { name: "Line 2", colorName: "Yellow Line", color: "#f6d71a" },
  },
}

describe("route map", () => {
  it("lists every station on a direct ride, in order", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000")
    if (!result.ok) throw new Error("expected journey")
    const stops = routeStops(result.journey, [red], "en")
    expect(stops[0]).toMatchObject({ code: "RI", name: "RITHALA", change: false })
    expect(stops.at(-1)).toMatchObject({ code: "KG", name: "KASHMERE GATE", stem: null })
    expect(stops).toHaveLength(14)
    expect(stops.every((stop) => stop.dot === "#c0282c")).toBe(true)
  })

  it("marks the shared station where the ride changes line", () => {
    const result = normalizeJourney(routeRiRck, null, "2026-09-30T12:00:00.000")
    if (!result.ok) throw new Error("expected journey")
    const stops = routeStops(result.journey, [red, yellow], "en")
    const change = stops.find((stop) => stop.change)
    expect(change).toMatchObject({ code: "KG", name: "KASHMERE GATE", stem: "#f6d71a" })
    expect(stops.filter((stop) => stop.code === "KG")).toHaveLength(1)
    expect(stops.at(-1)?.code).toBe("RCK")
  })

  it("starts the line map on the line you board", () => {
    const result = normalizeJourney(routeRiRck, null, "2026-09-30T12:00:00.000")
    if (!result.ok) throw new Error("expected journey")
    const lines: LineSequence[] = [
      { ...yellow, stations: [{ code: "KG", names: { en: "KASHMERE GATE" } }, { code: "RCK", names: { en: "RAJIV CHOWK" } }] },
      { ...red, stations: [{ code: "RI", names: { en: "RITHALA" } }, { code: "KG", names: { en: "KASHMERE GATE" } }] },
    ]
    expect(startLineCode(lines, result.journey)).toBe("LN1")
  })

  it("opens the branch that holds the ride when the first station is also on the trunk", () => {
    const trunk: LineSequence = {
      ...red,
      code: "LN3",
      stations: [{ code: "YB", names: { en: "YAMUNA BANK" } }],
    }
    const branch: LineSequence = {
      ...red,
      code: "LN4",
      stations: [
        { code: "YB", names: { en: "YAMUNA BANK" } },
        { code: "VASI", names: { en: "VAISHALI" } },
      ],
    }
    const journey = {
      legs: [{ stationCodes: ["YB", "VASI"] }],
    } as Parameters<typeof startLineCode>[1]
    expect(startLineCode([trunk, branch], journey)).toBe("LN4")
  })
})
