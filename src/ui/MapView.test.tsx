import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { copy } from "../i18n/copy"
import { MapView } from "./MapView"

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
    ],
  },
  {
    code: "LN3",
    show: true,
    label: {
      en: { name: "Blue", colorName: "Blue Line", color: "#3b76c0" },
      hi: { name: "Blue", colorName: "Blue Line", color: "#3b76c0" },
    },
    stations: [{ code: "RCK", names: { en: "RAJIV CHOWK" } }],
  },
]

describe("map line detail panes", () => {
  it("shows compact line dots and a line chart without Start, Go, Find, or SVG network", () => {
    const html = renderToStaticMarkup(
      <MapView
        copy={copy}
        lang="en"
        lines={lines}
        interchangeCodes={new Set(["RCK"])}
        highlightCodes={new Set()}
        focusLineCode={null}
        focusToken={0}
      />,
    )
    expect(html).toContain("map-pane")
    expect(html).toContain("map-line-swatches")
    expect(html).toContain("map-line-swatch-face")
    expect(html).toContain("map-line-chart")
    expect(html).toContain("RAJIV CHOWK")
    expect(html).toContain("Open")
    expect(html).toContain("map-maze")
    expect(html).toContain("map-maze-track")
    expect(html).toContain("map-maze-car")
    // Rides are replayed from the packer steps on the client, not in SSR markup.
    expect(html).toContain("map-detail-stage")
    expect(html).toContain(copy.mapPickStation)
    // One car path per visible line (2 in the fixture).
    expect(html.match(/map-maze-track/g)?.length).toBe(2)
    expect(html).not.toContain("map-detail-empty")
    expect(html).not.toContain("map-network")
    expect(html).not.toContain("map-legend-chip")
    expect(html).not.toContain("This ride")
    expect(html).not.toContain("Start here")
    expect(html).not.toContain("Go here")
    expect(html).not.toContain("Find a station")
    expect(html).not.toContain("<select")
  })
})
