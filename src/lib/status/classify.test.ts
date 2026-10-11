import { describe, expect, it } from "vitest"
import { accessFor, classifyNote, openAccess } from "./classify"

describe("status access", () => {
  it("keeps an open station fully usable", () => {
    expect(accessFor("Station Open", null)).toEqual(openAccess)
  })

  it("closes gates but keeps interchange when the note says so", () => {
    expect(
      accessFor(
        "Station Closed",
        "Due to security reasons, Rajiv Chowk Metro Station is  closed till further instructions.\r\n\r\nHowever, Interchange facility is available at Rajiv Chowk .",
      ),
    ).toEqual({ board: false, alight: false, transfer: true, pass: true })
  })

  it("blocks interchange when the note says it is not available", () => {
    expect(
      accessFor(
        "Station Closed",
        "New Delhi metro station has been closed till further instructions.\r\nThe interchange facility at New Delhi Metro station will not be available till further notice.",
      ),
    ).toEqual({ board: false, alight: false, transfer: false, pass: true })
  })

  it("blocks interchange when a closed station has no interchange sentence", () => {
    expect(accessFor("Station Closed", "Due to security reasons, Rithala metro Station is closed till further instructions.")).toEqual({
      board: false,
      alight: false,
      transfer: false,
      pass: true,
    })
  })

  it("does not treat an empty phrase as closed", () => {
    expect(accessFor("", null)).toEqual(openAccess)
  })

  it("reads interchange from the note alone", () => {
    expect(classifyNote("Interchange facility is available at Welcome.")).toBe("available")
    expect(classifyNote("The interchange facility at New Delhi Metro station will not be available till further notice.")).toBe("unavailable")
    expect(classifyNote("closed till further instructions.")).toBe("silent")
  })
})
