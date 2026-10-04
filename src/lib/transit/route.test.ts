import { describe, expect, it } from "vitest"
import { loadSnapshot } from "../dmrc/snapshot"
import routeRiKg from "../../../tests/fixtures/dmrc/route-ri-kg.json"
import { alternateRide, planRoute, resolveJourney, sameRide, type LineSequence } from "./route"
import type { Journey } from "./types"

function ride(codes: string[]): Journey {
  return {
    fetchedAt: "2026-09-30",
    criterion: "fewest-changes",
    originName: codes[0],
    destinationName: codes[codes.length - 1],
    changes: 0,
    durationMinutes: null,
    fare: { kind: "unavailable" },
    trains: { first: null, last: null },
    legs: [
      {
        lineCode: "LN1",
        lineName: "Red Line",
        towards: null,
        platform: null,
        rideStops: codes.length - 1,
        startName: codes[0],
        endName: codes[codes.length - 1],
        intermediateNames: [],
        stationCodes: codes,
      },
    ],
  }
}

function line(code: string, colorName: string, stations: string[]): LineSequence {
  return {
    code,
    show: true,
    label: {
      en: { name: code, colorName, color: "#000000" },
      hi: { name: code, colorName, color: "#000000" },
    },
    stations: stations.map((item) => ({ code: item, names: { en: item } })),
  }
}

describe("snapshot routing", () => {
  it("prefers fewer changes over a shorter ride with a change", () => {
    const lines = [
      line("LONG", "Red Line", ["A", "B", "C", "D", "E"]),
      line("SHORT1", "Blue Line", ["A", "X"]),
      line("SHORT2", "Green Line", ["X", "E"]),
    ]
    const journey = planRoute(lines, "A", "E", "en", "2026-09-30")
    expect(journey?.changes).toBe(0)
    expect(journey?.legs).toHaveLength(1)
    expect(journey?.legs[0].lineName).toBe("Red Line")
    expect(journey?.legs[0].rideStops).toBe(4)
    expect(journey?.fare).toEqual({ kind: "unavailable" })
    expect(journey?.durationMinutes).toBeNull()
    expect(journey?.criterion).toBe("fewest-changes")
  })

  it("changes at the shared station", () => {
    const lines = [line("L1", "Red Line", ["A", "B", "C"]), line("L2", "Yellow Line", ["C", "D"])]
    const journey = planRoute(lines, "A", "D", "en", "2026-09-30")
    expect(journey?.changes).toBe(1)
    expect(journey?.legs.map((leg) => [leg.startName, leg.endName, leg.lineName])).toEqual([
      ["A", "C", "Red Line"],
      ["C", "D", "Yellow Line"],
    ])
  })

  it("rides the saved Red Line from Rithala to Kashmere Gate", () => {
    const snapshot = loadSnapshot()
    const journey = planRoute(snapshot.lines, "RI", "KG", "en", snapshot.fetchedAt)
    expect(journey?.changes).toBe(0)
    expect(journey?.legs[0]).toMatchObject({
      lineName: "Red Line",
      startName: "RITHALA",
      endName: "KASHMERE GATE",
      towards: "SHAHEED STHAL ( NEW BUS ADDA)",
      rideStops: 13,
      platform: null,
    })
    expect(journey?.legs[0].intermediateNames).toContain("DR. BABA SAHEB AMBEDKAR HOSPITAL")
  })

  it("changes from Red to Yellow between Rithala and Rajiv Chowk", () => {
    const snapshot = loadSnapshot()
    const journey = planRoute(snapshot.lines, "RI", "RCK", "en", snapshot.fetchedAt)
    expect(journey?.changes).toBe(1)
    expect(journey?.legs.map((leg) => leg.lineName)).toEqual(["Red Line", "Yellow Line"])
    expect(journey?.legs[0].endName).toBe("KASHMERE GATE")
    expect(journey?.legs[1].endName).toBe("RAJIV CHOWK")
  })

  it("names the Blue Line branch with its line code", () => {
    const snapshot = loadSnapshot()
    const journey = planRoute(snapshot.lines, "YB", "VASI", "en", snapshot.fetchedAt)
    expect(journey?.changes).toBe(0)
    expect(journey?.legs[0].lineName).toBe("Blue Line (LN4)")
  })

  it("uses a saved planner response instead of the calculated route", () => {
    const snapshot = loadSnapshot()
    const journey = resolveJourney({
      savedRoute: routeRiKg,
      savedFare: null,
      lines: snapshot.lines,
      from: "RI",
      to: "KG",
      lang: "en",
      fetchedAt: snapshot.fetchedAt,
    })
    expect(journey?.criterion).toBe("least-distance")
    expect(journey?.fare).toEqual({ kind: "untyped", amount: 43 })
    expect(journey?.legs[0].platform).toBe("Platform No. 2")
    expect(journey?.durationMinutes).toBe(26)
  })

  it("keeps a second option only when the station sequence differs", () => {
    const direct = ride(["RI", "KG"])
    const other = ride(["RI", "RCK"])
    expect(sameRide(direct, ride(["RI", "KG"]))).toBe(true)
    expect(sameRide(direct, other)).toBe(false)
    expect(alternateRide(direct, ride(["RI", "KG"]))).toBeNull()
    expect(alternateRide(direct, other)).toBe(other)
    expect(alternateRide(direct, null)).toBeNull()
  })

  it("returns no route for a station code outside the snapshot", () => {
    const snapshot = loadSnapshot()
    expect(planRoute(snapshot.lines, "RI", "NOPE", "en", snapshot.fetchedAt)).toBeNull()
  })
})
