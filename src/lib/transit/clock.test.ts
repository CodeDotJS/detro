import { describe, expect, it } from "vitest"
import { formatClock } from "./clock"

describe("schedule clocks", () => {
  it("shows the hour and minute and drops the seconds without rounding up", () => {
    expect(formatClock("06:00:02")).toBe("6:00 am")
    expect(formatClock("06:00:59")).toBe("6:00 am")
    expect(formatClock("06:34:02")).toBe("6:34 am")
    expect(formatClock("23:00:00")).toBe("11:00 pm")
    expect(formatClock("23:25:49")).toBe("11:25 pm")
    expect(formatClock("00:05:10")).toBe("12:05 am")
    expect(formatClock("12:00:00")).toBe("12:00 pm")
  })

  it("leaves a clock missing when the saved value is not a time", () => {
    expect(formatClock("")).toBeNull()
    expect(formatClock("06:00")).toBeNull()
  })
})
