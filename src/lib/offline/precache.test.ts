import { describe, expect, it } from "vitest"
import { classifyPrecache } from "./precache"

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
})
