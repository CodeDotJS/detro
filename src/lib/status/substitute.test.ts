import { describe, expect, it } from "vitest"
import { accessByCode, type StatusPack } from "./pack"
import { allowSelectedEnds, substituteOpen } from "./substitute"

const pack: StatusPack = {
  fetchedAt: "2026-10-10T08:00:00.000",
  stations: {
    RCK: { phrase: "Station Closed", note: null, title: null, start: null, end: null, lineCodes: ["LN2"] },
    NDI: { phrase: "Station Closed", note: null, title: null, start: null, end: null, lineCodes: ["LN2"] },
  },
}

const coordinates = {
  RCK: { lat: 28.6328, lng: 77.2197 },
  NDI: { lat: 28.6425, lng: 77.221 },
  PTCK: { lat: 28.6229, lng: 77.2138 },
  CTST: { lat: 28.656, lng: 77.231 },
}

const access = (code: string) => accessByCode(pack, code)

describe("substitute a closed end", () => {
  it("names one nearest open start", () => {
    const next = substituteOpen("RCK", "CTST", pack, coordinates, access)
    expect(next).toEqual({ from: "PTCK", to: "CTST", replacedFrom: true, replacedTo: false })
  })

  it("names one nearest open destination", () => {
    const next = substituteOpen("PTCK", "NDI", pack, coordinates, access)
    expect(next).toEqual({ from: "PTCK", to: "CTST", replacedFrom: false, replacedTo: true })
  })

  it("leaves two open stations alone", () => {
    expect(substituteOpen("PTCK", "CTST", pack, coordinates, access)).toBeNull()
  })
})

describe("allow the selected ends", () => {
  it("lets the asked closed station be boarded", () => {
    const asked = allowSelectedEnds("RCK", "CTST", access)
    expect(asked("RCK").board).toBe(true)
    expect(asked("NDI").board).toBe(false)
  })
})
