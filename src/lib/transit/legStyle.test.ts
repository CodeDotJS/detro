import { describe, expect, it } from "vitest"
import { inkOn, legColor } from "./legStyle"
import type { Leg } from "./types"
import type { LineSequence } from "./route"

const red: LineSequence = {
  code: "LN1",
  show: true,
  label: {
    en: { name: "Red", colorName: "Red Line", color: "#c0282c" },
    hi: { name: "रेड", colorName: "रेड लाइन", color: "#c0282c" },
  },
  stations: [],
}

const leg = (lineName: string): Leg => ({
  lineCode: null,
  lineName,
  towards: null,
  platform: null,
  rideStops: 1,
  startName: "A",
  endName: "B",
  intermediateNames: [],
  stationCodes: [],
})

describe("line color on a journey leg", () => {
  it("matches the English and Hindi line names from the saved list", () => {
    expect(legColor(leg("Red Line"), [red], "en")).toBe("#c0282c")
    expect(legColor(leg("रेड लाइन"), [red], "hi")).toBe("#c0282c")
    expect(legColor(leg("Blue Line (LN4)"), [red], "en")).toBe("#5c6570")
  })

  it("picks dark ink on yellow and light ink on red", () => {
    expect(inkOn("#f6d71a")).toBe("#16181d")
    expect(inkOn("#c0282c")).toBe("#fffdf8")
  })
})
