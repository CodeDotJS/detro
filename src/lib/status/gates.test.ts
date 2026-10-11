import { describe, expect, it } from "vitest"
import { nearestOpen, openGatesAround } from "./gates"
import type { StatusPack } from "./pack"

const pack: StatusPack = {
  fetchedAt: "2026-10-10T08:00:00.000",
  stations: {
    B: { phrase: "Station Closed", note: null, title: null, start: null, end: null, lineCodes: ["LN"] },
    C: { phrase: "Station Closed", note: null, title: null, start: null, end: null, lineCodes: ["LN"] },
  },
}

const lines = [
  {
    code: "LN",
    show: true,
    label: {
      en: { name: "Yellow", colorName: "Yellow Line", color: "#f6d71a" },
      hi: { name: "Yellow", colorName: "Yellow Line", color: "#f6d71a" },
    },
    stations: [
      { code: "A", names: { en: "A" } },
      { code: "B", names: { en: "B" } },
      { code: "C", names: { en: "C" } },
      { code: "D", names: { en: "D" } },
    ],
  },
]

const coordinates = {
  A: { lat: 28.7, lng: 77.2 },
  B: { lat: 28.69, lng: 77.2 },
  C: { lat: 28.68, lng: 77.2 },
  D: { lat: 28.67, lng: 77.2 },
}

describe("open gates around a closed station", () => {
  it("names the open stop before and after on the line", () => {
    const picks = openGatesAround("B", pack, lines, coordinates)
    expect(picks.map((pick) => [pick.code, pick.kind])).toEqual([
      ["A", "before"],
      ["D", "after"],
    ])
    expect(picks[0]?.km != null && picks[0].km > 0).toBe(true)
    expect(picks[1]?.km != null && picks[1].km > picks[0]!.km!).toBe(true)
  })

  it("skips a closed neighbour and keeps walking the line", () => {
    const picks = openGatesAround("C", pack, lines, coordinates)
    expect(picks.find((pick) => pick.kind === "before")?.code).toBe("A")
    expect(picks.find((pick) => pick.kind === "after")?.code).toBe("D")
  })
})

describe("nearest open station", () => {
  it("uses geography when the closed station has a saved position", () => {
    const next = nearestOpen("B", pack, lines, coordinates)
    expect(next?.code).toBe("A")
    expect(next?.km != null && next.km > 0).toBe(true)
  })

  it("walks the line when the closed station has no saved position", () => {
    const next = nearestOpen("B", pack, lines, { A: coordinates.A, D: coordinates.D })
    expect(next?.code).toBe("A")
    expect(next?.km).toBeNull()
  })
})
