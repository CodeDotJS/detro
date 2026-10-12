import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { copy } from "../i18n/copy"
import type { StatusPack } from "../lib/status/pack"
import { StatusView } from "./StatusView"

const pack: StatusPack = {
  fetchedAt: "2026-10-10T08:00:00.000",
  serviceUpdate: {
    title: "SERVICE UPDATE",
    text: "New Delhi, Dated: 10.10.2026\nPatel Chowk and Rajiv Chowk stay closed.",
    dated: "10.10.2026",
    fetchedAt: "2026-10-10T08:00:00.000",
  },
  stations: {
    RCK: {
      phrase: "Station Closed",
      note: "However, Interchange facility is available at Rajiv Chowk .",
      title: "Service Update",
      start: "09-Oct-2026 09:00PM",
      end: "10-Oct-2026 11:59PM",
      lineCodes: ["LN2"],
    },
    NDI: {
      phrase: "Station Closed",
      note: "The interchange facility at New Delhi Metro station will not be available till further notice.",
      title: null,
      start: null,
      end: null,
      lineCodes: ["LN2"],
    },
  },
}

const history = {
  days: [
    {
      date: "2026-10-10",
      count: 45,
      stations: [
        { code: "RCK", name: "RAJIV CHOWK" },
        { code: "NDI", name: "NEW DELHI" },
      ],
    },
    {
      date: "2026-10-12",
      count: 2,
      stations: [
        { code: "RCK", name: "RAJIV CHOWK" },
        { code: "PTCK", name: "PATEL CHOWK" },
      ],
    },
  ],
}

const lines = [
  {
    code: "LN2",
    show: true,
    label: {
      en: { name: "Yellow", colorName: "Yellow Line", color: "#f6d71a" },
      hi: { name: "Yellow", colorName: "Yellow Line", color: "#f6d71a" },
    },
    stations: [
      { code: "PTCK", names: { en: "PATEL CHOWK" } },
      { code: "RCK", names: { en: "RAJIV CHOWK" } },
      { code: "NDI", names: { en: "NEW DELHI" } },
      { code: "CTST", names: { en: "CHANDNI CHOWK" } },
    ],
  },
]

const names = new Map([
  ["RCK", "RAJIV CHOWK"],
  ["NDI", "NEW DELHI"],
  ["PTCK", "PATEL CHOWK"],
  ["CTST", "CHANDNI CHOWK"],
])

const yellow = [{ code: "LN2", name: "Yellow", colorName: "Yellow Line", color: "#f6d71a" }]
const stations = [...names.entries()].map(([code, name]) => ({
  code,
  names: { en: name },
  lines: { en: yellow, hi: [] },
}))

const coordinates = {
  RCK: { lat: 28.6328, lng: 77.2197 },
  NDI: { lat: 28.6425, lng: 77.221 },
  PTCK: { lat: 28.6229, lng: 77.2138 },
  CTST: { lat: 28.656, lng: 77.231 },
}

function render(props: {
  here?: { lat: number; lng: number } | null
  initialFrom?: string | null
  initialDest?: string | null
  pack?: StatusPack
}) {
  return renderToStaticMarkup(
    <StatusView
      copy={copy}
      pack={props.pack ?? pack}
      history={history}
      names={names}
      stations={stations}
      lines={lines}
      coordinates={coordinates}
      here={props.here ?? null}
      locating={false}
      locateNote={null}
      onLocate={() => undefined}
      onPlan={() => undefined}
      onClear={() => undefined}
      initialFrom={props.initialFrom}
      initialDest={props.initialDest}
    />,
  )
}

describe("status board", () => {
  it("shows closed and open counts", () => {
    const html = render({})
    expect(html).toContain("status-stats")
    expect(html).toContain("2 stations have closed gates")
    expect(html).toContain(">2</strong>")
    expect(html).toContain("closed")
    expect(html).toContain("open")
    expect(html).toContain("RAJIV CHOWK")
    expect(html).toContain("NEW DELHI")
  })

  it("shows closure history and the baked service update", () => {
    const html = render({})
    expect(html).toContain("status-page")
    expect(html).toContain("status-below")
    expect(html).toContain("Closures over time")
    expect(html).toContain("status-history")
    expect(html).toContain("status-plot")
    expect(html).toContain("status-plot-col")
    expect(html).toContain("status-plot-fill")
    expect(html).toContain("All days")
    expect(html).toContain("status-history-trigger")
    expect(html).toContain("status-plot-cols")
    expect(html).toContain("10 Oct · 45 closed")
    expect(html).toContain("12 Oct · 2 closed")
    expect(html).not.toContain("Last week")
    expect(html).not.toContain("Last month")
    expect(html).toContain("status-service")
    expect(html).toContain(">Live<")
    expect(html).toContain("Packed from Delhi Metro")
    expect(html).toContain("10.10.2026")
    expect(html).toContain("Patel Chowk and Rajiv Chowk stay closed.")
  })

  it("looks up a station with the same catalog search as Plan", () => {
    const html = render({})
    expect(html).toContain('role="combobox"')
    expect(html).toContain('aria-autocomplete="list"')
    expect(html).toContain("Look up a station")
    expect(html).not.toContain('class="status-suggest"')
  })

  it("says when no station is closed", () => {
    const html = render({ pack: { fetchedAt: "2026-10-10T22:17:13.000", stations: {} } })
    expect(html).toContain("status-board is-empty")
    expect(html).toContain("0 stations have closed gates")
    expect(html).toContain("No closed stations in that check.")
    expect(html).not.toContain("status-line-btn")
    expect(html).not.toContain("RAJIV CHOWK")
  })

  it("groups closed stations on each line", () => {
    const html = render({})
    expect(html).toContain("status-tracks")
    expect(html).toContain("status-line-btn")
    expect(html).toContain("Yellow Line")
    expect(html).toContain("2 closed")
    expect(html).toContain("RAJIV CHOWK")
    expect(html).toContain("NEW DELHI")
    expect(html).not.toContain("status-rows")
    expect(html).not.toContain("PATEL CHOWK")
    expect(html).not.toContain("CHANDNI CHOWK")
  })

  it("lets you start or go from the nearest station", () => {
    const html = render({ here: coordinates.PTCK })
    expect(html).toContain("Nearest to you")
    expect(html).toContain("PATEL CHOWK")
    expect(html).toContain("Start here")
    expect(html).toContain("Go here")
    expect(html).toContain("status-look-clear")
    expect(html).toContain("Clear station")
  })

  it("names the nearest Delhi Metro station from a city outside Delhi", () => {
    const html = render({ here: { lat: 26.7606, lng: 83.3732 } })
    expect(html).toContain("Nearest to you")
    expect(html).toContain("CHANDNI CHOWK")
    expect(html).toContain("640.2 km")
    expect(html).not.toContain("outside the metro area")
  })

  it("measures nearest open from a looked-up station, not from a far fix", () => {
    const html = render({ here: { lat: 26.7606, lng: 83.3732 }, initialFrom: "RCK" })
    expect(html).toContain("RAJIV CHOWK")
    expect(html).toContain("Nearest open")
    expect(html).toContain("PATEL CHOWK")
    expect(html).not.toContain("Nearest to you")
    expect(html).not.toContain("640.2 km")
  })

  it("names one nearest open station when the nearest gate is closed", () => {
    const html = render({ here: coordinates.RCK })
    expect(html).toContain("status-alt")
    expect(html).toContain("status-official")
    expect(html).toContain("Nearest open")
    expect(html).toContain("PATEL CHOWK")
    expect(html).toContain("Nearest open station: PATEL CHOWK")
    expect(html).toContain("Interchange facility is available at Rajiv Chowk")
    expect(html.split("Interchange facility is available at Rajiv Chowk").length - 1).toBe(1)
    expect(html).not.toContain("09-Oct-2026")
    expect(html).not.toContain("11:59PM")
    expect(html).not.toContain("No board")
    expect(html).not.toContain("No leave")
    expect(html).not.toContain("RAJIV CHOWK is closed. Start at an open station.")
    expect(html).not.toContain("Before on the Yellow Line")
    expect(html).not.toContain("After on the Yellow Line")
  })

  it("names one get-off station when the destination is closed", () => {
    const html = render({ initialDest: "NDI" })
    expect(html).toContain("NEW DELHI")
    expect(html).toContain("Closed")
    expect(html).toContain("Nearest open")
    expect(html).toContain("Get off here")
    expect(html).toContain("Clear route")
    expect(html).toContain("interchange facility at New Delhi Metro station will not be available")
    expect(html).not.toContain("NEW DELHI is closed. Get off at an open station.")
    expect(html).not.toContain("Before on the Yellow Line")
  })

  it("names a nearest open stop on the line when the closed station has no saved position", () => {
    const html = renderToStaticMarkup(
      <StatusView
        copy={copy}
        pack={pack}
        history={history}
        names={names}
        stations={stations}
        lines={lines}
        coordinates={{ PTCK: coordinates.PTCK, CTST: coordinates.CTST }}
        here={null}
        locating={false}
        locateNote={null}
        onLocate={() => undefined}
        onPlan={() => undefined}
        onClear={() => undefined}
        initialFrom="RCK"
      />,
    )
    expect(html).toContain("RAJIV CHOWK")
    expect(html).toContain("Nearest open")
    expect(html).toContain("PATEL CHOWK")
    expect(html).not.toContain("status-km")
  })
})
