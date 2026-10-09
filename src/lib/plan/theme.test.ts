import { describe, expect, it } from "vitest"
import { defaultTheme, isTheme, nextTheme, themeColor, themePage, themeStorageKey, themes } from "./theme"

describe("display theme", () => {
  it("cycles day, night, and contrast, then back to day", () => {
    expect(themes).toEqual(["day", "night", "contrast"])
    expect(nextTheme("day")).toBe("night")
    expect(nextTheme("night")).toBe("contrast")
    expect(nextTheme("contrast")).toBe("day")
  })

  it("treats an unknown stored name as day", () => {
    expect(defaultTheme).toBe("day")
    expect(themeStorageKey).toBe("dms-theme")
    expect(isTheme("day")).toBe(true)
    expect(isTheme("night")).toBe(true)
    expect(isTheme("contrast")).toBe(true)
    expect(isTheme("system")).toBe(false)
    expect(isTheme("")).toBe(false)
    expect(nextTheme("system")).toBe("night")
  })

  it("maps each theme to a browser chrome colour", () => {
    expect(themeColor.day).toBe("#16181d")
    expect(themeColor.night).toBe("#101218")
    expect(themeColor.contrast).toBe("#000000")
    expect(themePage.day).toBe("#eef1f5")
    expect(themePage.night).toBe("#101218")
    expect(themePage.contrast).toBe("#ffffff")
  })
})
