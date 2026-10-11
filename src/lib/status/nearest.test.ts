import { describe, expect, it } from "vitest"
import { nearestBoardable, nearestStation } from "./nearest"
import type { StatusPack } from "./pack"

const pack: StatusPack = {
  fetchedAt: "2026-10-10T08:00:00.000",
  stations: {
    RCK: { phrase: "Station Closed", note: null, title: null, start: null, end: null, lineCodes: ["LN2"] },
  },
}

const coordinates = {
  RCK: { lat: 28.6328, lng: 77.2197 },
  PTCK: { lat: 28.6229, lng: 77.2138 },
  CTST: { lat: 28.6149, lng: 77.2118 },
}

describe("nearest station", () => {
  it("names the closest station even when its gates are closed", () => {
    expect(nearestStation(coordinates.RCK, coordinates)?.code).toBe("RCK")
    expect(nearestStation(coordinates.RCK, coordinates, "RCK")?.code).toBe("PTCK")
  })
})

describe("nearest station from outside Delhi", () => {
  it("still names the closest Delhi Metro station", () => {
    const next = nearestStation({ lat: 26.7606, lng: 83.3732 }, coordinates)
    expect(next?.code).toBe("RCK")
    expect(next && next.km > 500).toBe(true)
  })
})

describe("nearest boardable station", () => {
  it("picks the closest station that can still be boarded", () => {
    const next = nearestBoardable(coordinates.RCK, pack, coordinates, "RCK")
    expect(next?.code).toBe("PTCK")
    expect(next && next.km > 0).toBe(true)
  })

  it("skips a station with no saved position", () => {
    expect(nearestBoardable(coordinates.RCK, pack, { RCK: coordinates.RCK }, "RCK")).toBeNull()
  })
})
