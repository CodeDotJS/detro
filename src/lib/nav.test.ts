import { describe, expect, it } from "vitest"
import { pathForTab, tabFromPath } from "./nav"

describe("section paths", () => {
  it("reads the five sections", () => {
    expect(tabFromPath("/")).toBe("plan")
    expect(tabFromPath("/plan")).toBeNull()
    expect(tabFromPath("/map/")).toBe("map")
    expect(tabFromPath("/city")).toBe("city")
    expect(tabFromPath("/saved")).toBe("saved")
    expect(tabFromPath("/help")).toBe("help")
    expect(tabFromPath("/other")).toBeNull()
  })

  it("writes a path for each section", () => {
    expect(pathForTab("plan")).toBe("/")
    expect(pathForTab("map")).toBe("/map")
    expect(pathForTab("city")).toBe("/city")
    expect(pathForTab("saved")).toBe("/saved")
    expect(pathForTab("help")).toBe("/help")
  })
})
