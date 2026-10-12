import { describe, expect, it } from "vitest"
import {
  MAZE_CLEARANCE,
  dotTargets,
  growFromSeed,
  mazeAnimFingerprint,
  mazeMinClearance,
  mazeRouteCount,
  packMazeRoutes,
} from "./MapMaze"

describe("MapMaze routes", () => {
  it("packs a ride for every line slot across seeds", () => {
    for (const seed of [1, 2, 7, 19]) {
      expect(mazeRouteCount(seed)).toBeGreaterThanOrEqual(14)
    }
  })

  it("keeps cars from sharing track across seeds", () => {
    for (const seed of [1, 2, 7, 19]) {
      expect(mazeMinClearance(seed)).toBeGreaterThanOrEqual(MAZE_CLEARANCE)
    }
  })

  it("varies growth nuclei by seed", () => {
    expect(mazeAnimFingerprint(1)).not.toBe(mazeAnimFingerprint(2))
  })

  it("grows a corridor both ways from a random origin", () => {
    const points: Array<[number, number]> = [
      [0, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      [40, 0],
    ]
    const mid = growFromSeed(points, 2, 0)
    expect(mid).toHaveLength(1)
    expect(mid[0][0]).toBe(20)
    const half = growFromSeed(points, 2, 0.5)
    expect(half[0][0]).toBeLessThan(20)
    expect(half[half.length - 1][0]).toBeGreaterThan(20)
    const full = growFromSeed(points, 2, 1)
    expect(full[0][0]).toBe(0)
    expect(full[full.length - 1][0]).toBe(40)
  })

  it("gives the focused line one maze dot per station", () => {
    expect(dotTargets([8, 24, 10], 1)).toEqual([2, 24, 2])
    const layout = packMazeRoutes([8, 24, 10], 3, 1)
    expect(layout.routes[1].stops.length).toBe(24)
  })
})
