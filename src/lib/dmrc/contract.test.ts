import { describe, expect, it, vi } from "vitest"
import lineList from "../../../tests/fixtures/dmrc/line-list.en.json"
import fareRiKg from "../../../tests/fixtures/dmrc/fare-ri-kg.json"
import firstLastRiKg from "../../../tests/fixtures/dmrc/first-last-ri-kg.json"
import routeHi from "../../../tests/fixtures/dmrc/route-ri-kg.hi.json"
import routeFareRemoved from "../../../tests/fixtures/dmrc/route-ri-kg.fare-removed.json"
import routeRiKg from "../../../tests/fixtures/dmrc/route-ri-kg.json"
import routeRiRck from "../../../tests/fixtures/dmrc/route-ri-rck.json"
import searchEn from "../../../tests/fixtures/dmrc/search-rithala.en.json"
import stationsLn1 from "../../../tests/fixtures/dmrc/station-by-line.ln1.json"
import { createDmrcClient } from "./client"
import { createDebouncedSearch } from "./debounce"
import { DmrcError } from "./errors"
import { buildLineIndex, visibleLineCodes } from "./lines"
import { normalizeJourney } from "./normalize"
import { parseDmrcResponse } from "./parse"
import { farePath, keywordPath, stationRoutePath } from "./paths"
import { formatKolkataTimestamp } from "./time"
import htmlError from "../../../tests/fixtures/dmrc/route-unknown-station.html?raw"

describe("Kolkata timestamps", () => {
  it("formats wall time without an offset", () => {
    expect(formatKolkataTimestamp(new Date("2026-09-30T06:30:00.000Z"))).toBe(
      "2026-09-30T12:00:00.000",
    )
  })
})

describe("request paths", () => {
  it("builds a least-distance journey path with a raw timestamp", () => {
    expect(stationRoutePath("en", "RI", "KG", "2026-09-30T12:00:00.000")).toBe(
      "/en/station_route/RI/KG/least-distance/2026-09-30T12:00:00.000",
    )
  })

  it("encodes station search text", () => {
    expect(keywordPath("hi", "New Delhi")).toBe("/hi/station_by_keyword/all/New%20Delhi")
  })

  it("keeps the fare path trailing slash", () => {
    expect(farePath("en", "RI", "KG")).toBe("/en/new_fare_with_route/RI/KG/least-distance/")
  })
})

describe("response reading", () => {
  it("rejects the sanitized HTML error page", async () => {
    const response = new Response(htmlError, {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    })
    await expect(parseDmrcResponse(response)).rejects.toMatchObject({
      name: "DmrcError",
      kind: "html",
      status: 500,
    })
  })

  it("rejects HTML delivered with status 200", async () => {
    const response = new Response("<!DOCTYPE html><title>Blocked</title>", {
      status: 200,
      headers: { "content-type": "text/html" },
    })
    await expect(parseDmrcResponse(response)).rejects.toBeInstanceOf(DmrcError)
  })

  it("parses JSON", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
    await expect(parseDmrcResponse(response)).resolves.toEqual({ ok: true })
  })
})

describe("journey normalization", () => {
  it("reads the direct Rithala to Kashmere Gate response", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000Z")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.journey.originName).toBe("RITHALA")
    expect(result.journey.destinationName).toBe("KASHMERE GATE")
    expect(result.journey.changes).toBe(0)
    expect(result.journey.durationMinutes).toBe(26)
    expect(result.journey.fare).toEqual({ kind: "untyped", amount: 43 })
    expect(result.journey.legs).toHaveLength(1)
    expect(result.journey.legs[0]).toMatchObject({
      lineName: "Red Line",
      towards: "SHAHEED STHAL ( NEW BUS ADDA)",
      platform: "Platform No. 2",
      rideStops: 13,
      startName: "RITHALA",
      endName: "KASHMERE GATE",
    })
    expect(result.journey.legs[0].intermediateNames).toContain("ROHINI WEST")
    expect(result.journey.legs[0].intermediateNames).toContain("PITAMPURA")
  })

  it("reads the one-change Rithala to Rajiv Chowk response", () => {
    const result = normalizeJourney(routeRiRck, null, "2026-09-30T12:00:00.000Z")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.journey.changes).toBe(1)
    expect(result.journey.legs.map((leg) => leg.lineName)).toEqual(["Red Line", "Yellow Line"])
    expect(result.journey.legs[1]).toMatchObject({
      towards: "MILLENNIUM CITY CENTRE GURUGRAM",
      platform: "Platform No. 1",
      rideStops: 4,
      startName: "KASHMERE GATE",
      endName: "RAJIV CHOWK",
    })
  })

  it("keeps Hindi names from the Hindi journey payload", () => {
    const result = normalizeJourney(routeHi, null, "2026-09-30T12:00:00.000Z")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.journey.originName).toBe("रिठाला")
    expect(result.journey.destinationName).toBe("कश्मीरी गेट")
    expect(result.journey.legs[0].lineName).toBe("रेड लाइन")
    expect(result.journey.legs[0].platform).toBe("प्लेटफार्म नंबर 2")
  })

  it("does not turn a removed fare into zero", () => {
    const result = normalizeJourney(routeFareRemoved, null, "2026-09-30T12:00:00.000Z")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.journey.fare).toEqual({ kind: "unavailable" })
    expect(result.journey.changes).toBe(0)
  })

  it("reads first and last clocks and does not turn interchange time into a count", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000Z", firstLastRiKg)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.journey.trains).toEqual({
      first: { depart: "06:00:02", arrive: "06:34:02" },
      last: { depart: "23:00:00", arrive: "23:25:49" },
    })
    expect(result.journey.changes).toBe(0)
  })

  it("keeps first and last missing when that payload has no clocks", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000Z", {
      first_train: { first_train_route_detail: [{ start_time: "", interchange_time: "" }] },
      last_train: { last_train_route_detail: [{ interchange_time: 5 }] },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.journey.trains).toEqual({ first: null, last: null })
  })

  it("uses the origin departure and the destination arrival when the train changes", () => {
    const result = normalizeJourney(routeRiKg, null, "2026-09-30T12:00:00.000Z", {
      first_train: {
        endstation_from_first_train_estimated_time: "06:08:40",
        first_train_route_detail: [
          { start_time: "05:38:44", end_time: "05:59:34", interchange_time: "" },
          { start_time: "06:05:00", end_time: "06:08:40", interchange_time: "" },
        ],
      },
      last_train: {
        endstation_from_last_train_estimated_time: "23:18:38",
        last_train_route_detail: [
          { start_time: "22:45:15", end_time: "23:04:50", interchange_time: 0 },
          { start_time: "23:15:06", end_time: "23:18:38", interchange_time: 5 },
        ],
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.journey.trains).toEqual({
      first: { depart: "05:38:44", arrive: "06:08:40" },
      last: { depart: "22:45:15", arrive: "23:18:38" },
    })
  })

  it("uses weekday and weekend fares when that payload succeeds", () => {
    const result = normalizeJourney(routeRiKg, fareRiKg, "2026-09-30T12:00:00.000Z")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.journey.fare).toEqual({ kind: "weekday-weekend", weekday: 43, weekend: 32 })
  })

  it("treats an empty route as no journey", () => {
    expect(normalizeJourney({ route: [] }, null, "2026-09-30T12:00:00.000Z")).toEqual({
      ok: false,
      reason: "empty-route",
    })
  })
})

describe("line index", () => {
  it("hides the line the official site does not show", () => {
    expect(visibleLineCodes(lineList)).not.toContain("LN12")
    expect(visibleLineCodes(lineList)).toContain("LN1")
  })

  it("attaches Red Line to Rithala from the captured line list", () => {
    const index = buildLineIndex(lineList, [{ lineCode: "LN1", payload: stationsLn1 }])
    expect(index.get("RI")).toEqual([
      expect.objectContaining({
        code: "LN1",
        colorName: "Red Line",
        color: "#c0282c",
      }),
    ])
    expect([...index.values()].flat().some((line) => line.code === "LN12")).toBe(false)
  })
})

describe("client", () => {
  it("requests the journey and fare with the Kolkata timestamp", async () => {
    const calls: string[] = []
    const client = createDmrcClient(
      async (input) => {
        const url = String(input)
        calls.push(url)
        if (url.includes("/station_route/")) {
          return Response.json(routeRiKg)
        }
        if (url.includes("/new_fare_with_route/")) {
          return Response.json(fareRiKg)
        }
        return new Response("missing", { status: 404 })
      },
      () => new Date("2026-09-30T06:30:00.000Z"),
    )

    const journey = await client.planJourney("RI", "KG", "en")
    expect(journey.fare).toEqual({ kind: "weekday-weekend", weekday: 43, weekend: 32 })
    expect(calls[0]).toContain(
      "/api/v2/en/station_route/RI/KG/least-distance/2026-09-30T12:00:00.000",
    )
    expect(calls[1]).toContain("/api/v2/en/new_fare_with_route/RI/KG/least-distance/")
  })

  it("keeps the journey fare when the fare request returns HTML", async () => {
    const client = createDmrcClient(async (input) => {
      const url = String(input)
      if (url.includes("/station_route/")) return Response.json(routeRiKg)
      return new Response(htmlError, {
        status: 500,
        headers: { "content-type": "text/html" },
      })
    })
    const journey = await client.planJourney("RI", "KG", "en")
    expect(journey.fare).toEqual({ kind: "untyped", amount: 43 })
  })

  it("shares one in-flight line list request", async () => {
    let fetches = 0
    const client = createDmrcClient(async (input) => {
      const url = String(input)
      if (url.endsWith("/en/line_list")) {
        fetches += 1
        return Response.json(lineList)
      }
      if (url.includes("/station_by_line/")) return Response.json(stationsLn1)
      return new Response("no", { status: 404 })
    })
    await Promise.all([client.loadLineIndex("en"), client.loadLineIndex("en")])
    expect(fetches).toBe(1)
  })

  it("reads a station code from keyword search", async () => {
    const client = createDmrcClient(async () => Response.json(searchEn))
    await expect(client.searchStations("Rithala", "en")).resolves.toEqual([
      expect.objectContaining({ code: "RI", name: "RITHALA" }),
    ])
  })
})

describe("search timing", () => {
  it("drops an older search when a newer one is scheduled", async () => {
    vi.useFakeTimers()
    const run = vi.fn(async (query: string) => [{ code: query, name: query }])
    const search = createDebouncedSearch(300, run)
    const seen: string[] = []
    search.push("ri", (result) => {
      if ("stations" in result) seen.push(result.stations.map((item) => item.code).join(","))
    })
    search.push("rith", (result) => {
      if ("stations" in result) seen.push(result.stations.map((item) => item.code).join(","))
    })
    await vi.advanceTimersByTimeAsync(300)
    expect(run).toHaveBeenCalledTimes(1)
    expect(run.mock.calls[0][0]).toBe("rith")
    expect(seen).toEqual(["rith"])
    vi.useRealTimers()
  })
})
