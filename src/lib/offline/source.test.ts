import { describe, expect, it } from "vitest"
import { routeSource } from "./source"

describe("offline route source", () => {
  it("uses a saved journey file only while online", () => {
    expect(routeSource(true, true)).toBe("saved")
    expect(routeSource(true, false)).toBe("calculated")
  })

  it("calculates from the saved network while offline", () => {
    expect(routeSource(false, true)).toBe("offline")
    expect(routeSource(false, false)).toBe("offline")
  })
})
