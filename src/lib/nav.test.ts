import { describe, expect, it } from "vitest"
import { pathForTab, tabFromPath } from "./nav"

describe("section paths", () => {
  it("reads the seven sections", () => {
    expect(tabFromPath("/")).toBe("plan")
    expect(tabFromPath("/plan")).toBeNull()
    expect(tabFromPath("/status")).toBe("status")
    expect(tabFromPath("/saved")).toBe("saved")
    expect(tabFromPath("/city")).toBe("city")
    expect(tabFromPath("/play")).toBe("play")
    expect(tabFromPath("/lines")).toBe("lines")
    expect(tabFromPath("/map")).toBeNull()
    expect(tabFromPath("/help")).toBe("help")
    expect(tabFromPath("/other")).toBeNull()
  })

  it("writes a path for each section", () => {
    expect(pathForTab("plan")).toBe("/")
    expect(pathForTab("status")).toBe("/status")
    expect(pathForTab("saved")).toBe("/saved")
    expect(pathForTab("city")).toBe("/city")
    expect(pathForTab("play")).toBe("/play")
    expect(pathForTab("lines")).toBe("/lines")
    expect(pathForTab("help")).toBe("/help")
  })
})
