import { describe, expect, it } from "vitest"
import { chartSeries, filterHistory, historyRangeOptions, historyYears, readHistory } from "./history"

const history = readHistory({
  days: [
    { date: "2026-10-05", stations: [{ code: "RCK", name: "RAJIV CHOWK" }] },
    {
      date: "2026-10-12",
      stations: [
        { code: "RCK", name: "RAJIV CHOWK" },
        { code: "PTCK", name: "PATEL CHOWK" },
      ],
    },
    { date: "2025-03-01", stations: [{ code: "NDI", name: "NEW DELHI" }] },
  ],
})

const young = readHistory({
  days: [
    {
      date: "2026-10-10",
      stations: Array.from({ length: 45 }, (_, i) => ({ code: `C${i}`, name: `Station ${i}` })),
    },
    {
      date: "2026-10-12",
      stations: [
        { code: "RCK", name: "RAJIV CHOWK" },
        { code: "PTCK", name: "PATEL CHOWK" },
      ],
    },
  ],
})

describe("status history", () => {
  it("reads count from stations", () => {
    expect(history.days.map((day) => ({ date: day.date, count: day.count }))).toEqual([
      { date: "2025-03-01", count: 1 },
      { date: "2026-10-05", count: 1 },
      { date: "2026-10-12", count: 2 },
    ])
  })

  it("lists years newest first", () => {
    expect(historyYears(history)).toEqual([2026, 2025])
  })

  it("offers only ranges the history can support", () => {
    expect(historyRangeOptions(young, "2026-10-12").map((item) => item.value)).toEqual(["all", 2026])
    expect(historyRangeOptions(history, "2026-10-12").map((item) => item.value)).toEqual([
      "all",
      "week",
      "month",
      "year",
      2026,
      2025,
    ])
  })

  it("filters last week and fills missing days with zero", () => {
    expect(filterHistory(history, "week", "2026-10-12").map((day) => day.date)).toEqual(["2026-10-12"])
    const series = chartSeries(history, "week", "2026-10-12")
    expect(series).toHaveLength(7)
    expect(series[0]).toEqual({ date: "2026-10-06", count: 0 })
    expect(series.at(-1)).toEqual({ date: "2026-10-12", count: 2 })
  })

  it("plots only recorded days for all", () => {
    expect(chartSeries(young, "all", "2026-10-12")).toEqual([
      { date: "2026-10-10", count: 45 },
      { date: "2026-10-12", count: 2 },
    ])
  })

  it("includes a day on the edge of the week window", () => {
    expect(filterHistory(history, "week", "2026-10-11").map((day) => day.date)).toEqual(["2026-10-05"])
  })

  it("filters a chosen year", () => {
    expect(filterHistory(history, 2025, "2026-10-12").map((day) => day.date)).toEqual(["2025-03-01"])
  })
})
