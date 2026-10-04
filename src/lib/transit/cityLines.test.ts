import { describe, expect, it } from "vitest"
import { lineThreads, ridePath, routeSegments } from "./cityLines"

const coordinates = {
  RI: { lat: 1, lng: 1 },
  KG: { lat: 2, lng: 2 },
  RCK: { lat: 3, lng: 3 },
}

describe("city route lines", () => {
  it("breaks a line where a station has no coordinate", () => {
    expect(
      lineThreads(
        [
          { code: "LN1", show: true, color: "#c0282c", stationCodes: ["RI", "GAP", "KG"] },
          { code: "LN12", show: false, color: "#808080", stationCodes: ["RI", "KG"] },
        ],
        coordinates,
      ),
    ).toEqual([])
    expect(
      lineThreads([{ code: "LN1", show: true, color: "#c0282c", stationCodes: ["RI", "KG", "RCK"] }], coordinates),
    ).toEqual([{ code: "LN1", color: "#c0282c", points: [[1, 1], [2, 2], [3, 3]] }])
  })

  it("dashes the ride where a station has no coordinate", () => {
    const stops = [
      { code: "RI", stem: "#c0282c" },
      { code: "MISSING", stem: "#c0282c" },
      { code: "KG", stem: "#f6d71a" },
      { code: "RCK", stem: null },
    ]
    expect(ridePath(stops, coordinates)).toEqual([
      { color: "#c0282c", points: [[1, 1], [2, 2]], dashed: true },
      { color: "#f6d71a", points: [[2, 2], [3, 3]], dashed: false },
    ])
  })

  it("draws a segment only between stations that both have coordinates", () => {
    const stops = [
      { code: "RI", stem: "#c0282c" },
      { code: "MISSING", stem: "#c0282c" },
      { code: "KG", stem: "#f6d71a" },
      { code: "RCK", stem: null },
    ]
    expect(routeSegments(stops, coordinates)).toEqual([
      { color: "#f6d71a", points: [[2, 2], [3, 3]] },
    ])
  })
})
