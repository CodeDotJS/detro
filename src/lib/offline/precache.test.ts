import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { SHELL_CACHE, SNAPSHOT_CACHE } from "./caches"
import { backgroundOrder, classifyPrecache } from "./precache"

describe("offline precache list", () => {
  it("keeps the app shell separate from station briefs", () => {
    const list = classifyPrecache([
      "/index.html",
      "/assets/app.js",
      "/attractions/metro-people.svg",
      "/precache.json",
      "/snapshot/en/station_brief/GNPK.json",
      "/snapshot/en/routes/least-distance/RI/KG.json",
    ])
    expect(list.shell).toEqual(["/", "/index.html", "/assets/app.js", "/attractions/metro-people.svg"])
    expect(list.snapshot).toEqual([
      "/snapshot/en/station_brief/GNPK.json",
      "/snapshot/en/routes/least-distance/RI/KG.json",
    ])
  })

  it("saves the app, then journeys, then street tiles", () => {
    expect(
      backgroundOrder({
        shell: ["/", "/sw.js", "/assets/app.js", "/map-tiles/9/1/1.png", "/attractions/metro-people.svg"],
        snapshot: ["/snapshot/en/station_brief/RI.json", "/snapshot/en/journeys/RI.json"],
      }),
    ).toEqual([
      ["/", "/assets/app.js", "/attractions/metro-people.svg"],
      ["/snapshot/en/journeys/RI.json"],
      ["/snapshot/en/station_brief/RI.json"],
      ["/map-tiles/9/1/1.png"],
    ])
  })

  it("uses the same cache names as the service worker", () => {
    const source = readFileSync(new URL("../../../public/sw.js", import.meta.url), "utf8")
    expect(source).toContain(SHELL_CACHE)
    expect(source).toContain(SNAPSHOT_CACHE)
  })
})
