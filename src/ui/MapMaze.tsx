import { useEffect, useMemo, useState } from "react"
import { useReducedMotion } from "motion/react"

const VIEW_W = 420
const VIEW_H = 360
const MAX_LINES = 16
/** Center-to-center clearance so 14×11 cars never overlap. */
export const MAZE_CLEARANCE = 20
const COLS = 17
const ROWS = 14
const CELL = 22
/** Pad so the packed grid sits in the middle of the viewBox. */
const OX = Math.round((VIEW_W - (COLS - 1) * CELL) / 2)
const OY = Math.round((VIEW_H - (ROWS - 1) * CELL) / 2)
const BUILD_MS = 1200

type Pt = readonly [number, number]

function nodeKey(c: number, r: number): string {
  return `${c},${r}`
}

function pt(c: number, r: number): Pt {
  return [OX + c * CELL, OY + r * CELL] as const
}

function parseNode(key: string): [number, number] {
  const [c, r] = key.split(",").map(Number)
  return [c, r]
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function ortho(points: Pt[]): string {
  if (points.length === 0) return ""
  let d = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]
    const [px, py] = points[i - 1]
    if (x === px) d += ` V ${y}`
    else if (y === py) d += ` H ${x}`
    else d += ` L ${x} ${y}`
  }
  return d
}

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function pointAt(points: Pt[], f: number): Pt {
  if (points.length === 0) return [0, 0]
  if (f <= 0) return points[0]
  if (f >= points.length - 1) return points[points.length - 1]
  const i = Math.floor(f)
  return lerpPt(points[i], points[i + 1], f - i)
}

/**
 * Grow a corridor from a random origin along the packed path —
 * both directions at once, like a connection spreading from a node.
 */
export function growFromSeed(points: Pt[], seedIndex: number, progress: number): Pt[] {
  if (points.length === 0) return []
  const s = Math.max(0, Math.min(points.length - 1, seedIndex))
  const t = Math.min(1, Math.max(0, progress))
  if (t <= 0 || points.length === 1) return [points[s]]
  const lo = s - s * t
  const hi = s + (points.length - 1 - s) * t
  if (hi - lo < 1e-4) return [points[s]]
  const out: Pt[] = [pointAt(points, lo)]
  const firstInner = Math.floor(lo) + 1
  const lastInner = Math.ceil(hi) - 1
  for (let i = firstInner; i <= lastInner; i++) {
    if (i > 0 && i < points.length - 1) out.push(points[i])
    else if (i >= 0 && i < points.length) out.push(points[i])
  }
  const end = pointAt(points, hi)
  const prev = out[out.length - 1]
  if (!prev || Math.hypot(prev[0] - end[0], prev[1] - end[1]) > 0.2) out.push(end)
  return out
}

/** Deterministic 0..1 from seed + salt. */
function rand(seed: number, salt: number): number {
  let x = (seed * 374761393 + salt * 668265263) | 0
  x = Math.imul(x ^ (x >>> 15), x | 1)
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296
}

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 3
}

function buildMazeEdges(seed: number): Array<[string, string]> {
  const edges: Array<[string, string]> = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) {
        const cut = rand(seed, c * 17 + r * 41) < 0.11 && c > 0 && c + 1 < COLS - 1
        if (!cut) edges.push([nodeKey(c, r), nodeKey(c + 1, r)])
      }
      if (r + 1 < ROWS) {
        const cut = rand(seed, r * 29 + c * 13 + 99) < 0.12 && r > 0 && r + 1 < ROWS - 1
        if (!cut) edges.push([nodeKey(c, r), nodeKey(c, r + 1)])
      }
    }
  }
  return edges
}

function buildAdj(edges: Array<[string, string]>): Map<string, string[]> {
  const adj = new Map<string, string[]>()
  const add = (a: string, b: string) => {
    const list = adj.get(a) ?? []
    list.push(b)
    adj.set(a, list)
  }
  for (const [a, b] of edges) {
    add(a, b)
    add(b, a)
  }
  return adj
}

/** Multi-source flood from random nodes — edges in discovery order. */
function multiSourceGridOrder(
  edges: Array<[string, string]>,
  adj: Map<string, string[]>,
  seed: number,
): number[] {
  const edgeIndex = new Map<string, number>()
  edges.forEach(([a, b], i) => edgeIndex.set(edgeKey(a, b), i))
  const nodes = [...adj.keys()]
  if (nodes.length === 0) return edges.map((_, i) => i)

  const seedCount = 3 + Math.floor(rand(seed, 3) * 4)
  const picks: string[] = []
  const used = new Set<string>()
  for (let n = 0; n < seedCount * 6 && picks.length < seedCount; n++) {
    const pick = nodes[Math.floor(rand(seed, 40 + n) * nodes.length)]
    if (!used.has(pick)) {
      used.add(pick)
      picks.push(pick)
    }
  }

  const seenNode = new Set<string>(picks)
  const seenEdge = new Set<string>()
  const order: number[] = []
  const queue = [...picks]
  let q = 0
  while (q < queue.length) {
    const at = queue[q++]
    const nbrs = [...(adj.get(at) ?? [])]
    nbrs.sort(
      (a, b) =>
        rand(seed, parseNode(a)[0] * 41 + parseNode(a)[1] * 7 + q) -
        rand(seed, parseNode(b)[0] * 41 + parseNode(b)[1] * 7 + q),
    )
    for (const n of nbrs) {
      const ek = edgeKey(at, n)
      if (!seenEdge.has(ek)) {
        seenEdge.add(ek)
        const idx = edgeIndex.get(ek)
        if (idx != null) order.push(idx)
      }
      if (!seenNode.has(n)) {
        seenNode.add(n)
        queue.push(n)
      }
    }
  }
  for (let i = 0; i < edges.length; i++) {
    if (!order.includes(i)) order.push(i)
  }
  return order
}

export type MazeRoute = {
  d: string
  points: Array<[number, number]>
  stops: Array<[number, number]>
  begin: string
  dur: string
  /** Random origin along the path — growth spreads both ways from here. */
  seedIndex: number
  drawDelay: number
  drawMs: number
  seedPoint: [number, number]
}

export type MazeLayout = {
  grid: string[]
  gridOrder: number[]
  gridMs: number
  /** Random grid nuclei the underlay flood starts from. */
  gridSeeds: Array<[number, number]>
  routes: MazeRoute[]
  buildMs: number
}

/** How many maze dots each line should try to claim. Focused line keeps full station count. */
export function dotTargets(stationCounts: number[], focusIndex: number | null): number[] {
  const cap = COLS * ROWS - 8
  if (focusIndex != null && focusIndex >= 0 && focusIndex < stationCounts.length) {
    return stationCounts.map((n, i) => {
      if (i === focusIndex) return Math.max(2, Math.min(n, cap))
      // Leave the board free for the clicked line’s stations.
      return 2
    })
  }
  const budget = 150
  const sum = stationCounts.reduce((a, b) => a + Math.max(0, b), 0) || 1
  return stationCounts.map((n) => {
    const share = Math.floor((budget * Math.max(0, n)) / sum)
    return Math.max(2, Math.min(n, share))
  })
}

/**
 * Pack exclusive rides sized to each line’s station count, then grow
 * connections from random origins. A focused line is packed first with
 * one dot per station on that line.
 */
export function packMazeRoutes(
  stationCounts: number[],
  seed: number,
  focusIndex: number | null = null,
): MazeLayout {
  const edges = buildMazeEdges(seed)
  const adj = buildAdj(edges)
  const usedNodes = new Set<string>()
  const usedEdges = new Set<string>()
  const targets = dotTargets(stationCounts, focusIndex)
  const routePoints: Array<Pt[] | null> = Array.from({ length: targets.length }, () => null)

  const freeNeighbors = (k: string): string[] =>
    (adj.get(k) ?? []).filter((n) => !usedNodes.has(n) && !usedEdges.has(edgeKey(k, n)))

  const walk = (start: string, minLen: number, maxLen: number, lineIndex: number): string[] | null => {
    const path = [start]
    let prev: string | null = null
    while (path.length < maxLen) {
      const at = path[path.length - 1]
      const options = freeNeighbors(at).filter((n) => !path.includes(n))
      if (options.length === 0) break
      const [, ar] = parseNode(at)
      let best = options[0]
      let bestScore = -Infinity
      for (const n of options) {
        const [nc, nr] = parseNode(n)
        let turn = 0
        if (prev) {
          const [, pr] = parseNode(prev)
          const inH = pr === ar
          const outH = ar === nr
          turn = inH === outH ? 0 : 2
        }
        const jitter = rand(seed, lineIndex * 1009 + path.length * 17 + nc * 3 + nr) * 5
        const score = turn * 2.2 + jitter
        if (score > bestScore) {
          bestScore = score
          best = n
        }
      }
      path.push(best)
      prev = at
    }
    return path.length >= minLen ? path : null
  }

  const seedOrder: Array<[number, number]> = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) seedOrder.push([c, r])
  }
  seedOrder.sort(
    (a, b) =>
      rand(seed, a[0] * 31 + a[1] * 57 + 3) - rand(seed, b[0] * 31 + b[1] * 57 + 3),
  )

  const gridOrder = multiSourceGridOrder(edges, adj, seed)
  const gridSeeds: Array<[number, number]> = []
  {
    const seedCount = 3 + Math.floor(rand(seed, 3) * 4)
    const seen = new Set<string>()
    for (let n = 0; n < seedCount * 8 && gridSeeds.length < seedCount; n++) {
      const c = Math.floor(rand(seed, 90 + n) * COLS)
      const r = Math.floor(rand(seed, 110 + n) * ROWS)
      const k = nodeKey(c, r)
      if (!seen.has(k) && adj.has(k)) {
        seen.add(k)
        gridSeeds.push([pt(c, r)[0], pt(c, r)[1]])
      }
    }
  }

  // Focused line first so it can claim one node per station.
  const packOrder = targets.map((_, i) => i)
  packOrder.sort((a, b) => {
    if (focusIndex != null) {
      if (a === focusIndex) return -1
      if (b === focusIndex) return 1
    }
    return targets[b] - targets[a]
  })

  for (const i of packOrder) {
    const target = targets[i]
    let best: string[] | null = null

    // Prefer an exact-length corridor (= station count).
    for (const [c, r] of seedOrder) {
      const start = nodeKey(c, r)
      if (usedNodes.has(start) || !adj.has(start)) continue
      const path = walk(start, target, target, i)
      if (path && path.length === target) {
        best = path
        break
      }
    }
    if (!best) {
      for (const [c, r] of seedOrder) {
        const start = nodeKey(c, r)
        if (usedNodes.has(start) || !adj.has(start)) continue
        const path = walk(start, Math.min(2, target), target, i)
        if (!path) continue
        if (!best || path.length > best.length) best = path
        if (best.length >= target) break
      }
    }
    if (!best) {
      for (const [a, b] of edges) {
        if (!usedNodes.has(a) && !usedNodes.has(b) && !usedEdges.has(edgeKey(a, b))) {
          best = [a, b]
          break
        }
      }
    }
    if (!best) continue

    for (let p = 0; p < best.length; p++) {
      usedNodes.add(best[p])
      if (p > 0) usedEdges.add(edgeKey(best[p - 1], best[p]))
    }
    routePoints[i] = best.map((k) => pt(...parseNode(k)))
  }

  const grid = edges.map(([a, b]) => {
    const [x1, y1] = pt(...parseNode(a))
    const [x2, y2] = pt(...parseNode(b))
    return `M ${x1} ${y1} L ${x2} ${y2}`
  })

  const gridMs = 520 + rand(seed, 11) * 160
  const routes: MazeRoute[] = routePoints.map((points, index) => {
    const pts = (points ?? [pt(0, 0)]).map(([x, y]) => [x, y] as [number, number])
    const seedIndex =
      pts.length <= 1 ? 0 : 1 + Math.floor(rand(seed, 300 + index * 13) * Math.max(1, pts.length - 2))
    const drawDelay =
      focusIndex != null && index !== focusIndex
        ? 0
        : 40 + rand(seed, 200 + index * 17) * 200
    const drawMs = 420 + rand(seed, 400 + index * 31) * 280 + pts.length * 8
    const seedPoint = pts[seedIndex] ?? pts[0] ?? ([0, 0] as [number, number])
    return {
      d: ortho(pts),
      points: pts,
      // One visible stop per packed node — matches station count when packing hits target.
      stops: pts,
      begin: `${(-index * 1.45 - rand(seed, 50 + index) * 2).toFixed(2)}s`,
      dur: `${14 + rand(seed, 60 + index) * 6}s`,
      seedIndex,
      drawDelay,
      drawMs,
      seedPoint,
    }
  })

  const active =
    focusIndex != null ? routes.filter((_, i) => i === focusIndex) : routes
  const lastRide = active.reduce((max, r) => Math.max(max, r.drawDelay + r.drawMs), 0)
  const buildMs = Math.max(BUILD_MS, Math.ceil(Math.max(gridMs, lastRide) + 60))

  return { grid, gridOrder, gridMs, gridSeeds, routes, buildMs }
}

function samplePath(d: string, spacing: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let x = 0
  let y = 0
  const re = /([MLHVZ])\s*([\d.\s-]*)/gi
  let match: RegExpExecArray | null
  const pushSeg = (x2: number, y2: number) => {
    const len = Math.hypot(x2 - x, y2 - y)
    const steps = Math.max(1, Math.ceil(len / spacing))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      out.push([x + (x2 - x) * t, y + (y2 - y) * t])
    }
    x = x2
    y = y2
  }
  while ((match = re.exec(d))) {
    const cmd = match[1].toUpperCase()
    const nums = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
    if (cmd === "M") {
      x = nums[0]
      y = nums[1]
      out.push([x, y])
    } else if (cmd === "L") {
      pushSeg(nums[0], nums[1])
    } else if (cmd === "H") {
      pushSeg(nums[0], y)
    } else if (cmd === "V") {
      pushSeg(x, nums[0])
    }
  }
  return out
}

function defaultCounts(n: number, stations = 12): number[] {
  return Array.from({ length: n }, () => stations)
}

export function mazeMinClearance(seed = 1): number {
  const { routes } = packMazeRoutes(defaultCounts(MAX_LINES), seed)
  const samples = routes.map((route) => samplePath(route.d, 3))
  let min = Infinity
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      for (const [x1, y1] of samples[i]) {
        for (const [x2, y2] of samples[j]) {
          const d = Math.hypot(x1 - x2, y1 - y2)
          if (d < min) min = d
        }
      }
    }
  }
  return min
}

export function mazeRouteCount(seed = 1): number {
  return packMazeRoutes(defaultCounts(MAX_LINES), seed).routes.length
}

export function mazeAnimFingerprint(seed: number): string {
  const layout = packMazeRoutes(defaultCounts(MAX_LINES), seed)
  return [
    layout.gridSeeds.map((p) => p.join(",")).join(";"),
    layout.routes.map((r) => `${r.seedIndex}:${r.stops.length}`).join("|"),
  ].join("/")
}

export type MazeLine = { code: string; color: string; stations: number }

export function MapMaze({
  lines,
  focusedLineCode,
  rebuildKey = 0,
  label,
}: {
  lines: MazeLine[]
  focusedLineCode: string | null
  rebuildKey?: number
  label: string
}) {
  const run = !useReducedMotion()
  const visible = lines.slice(0, MAX_LINES)
  const focusIndex = focusedLineCode
    ? visible.findIndex((line) => line.code === focusedLineCode)
    : -1
  const stationKey = visible.map((line) => `${line.code}:${line.stations}`).join("|")
  const layout = useMemo(
    () =>
      packMazeRoutes(
        visible.map((line) => line.stations),
        rebuildKey + 1,
        focusIndex >= 0 ? focusIndex : null,
      ),
    // stationKey captures line identity + counts; focusIndex reshapes on swatch click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rebuildKey, stationKey, focusIndex],
  )
  const [elapsed, setElapsed] = useState(0)
  const done = !run || elapsed >= layout.buildMs

  useEffect(() => {
    if (!run) {
      setElapsed(layout.buildMs)
      return
    }
    setElapsed(0)
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const next = Math.min(layout.buildMs, now - start)
      setElapsed(next)
      if (next < layout.buildMs) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [rebuildKey, run, layout.buildMs, focusIndex])

  const tracks = visible.map((line, index) => ({
    ...line,
    ...(layout.routes[index] ?? layout.routes[layout.routes.length - 1]),
  }))

  const gridCount = done
    ? layout.gridOrder.length
    : Math.floor(easeOutCubic(elapsed / layout.gridMs) * layout.gridOrder.length)
  const gridVisible = new Set(layout.gridOrder.slice(0, gridCount))

  return (
    <svg
      className="map-maze"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="map-maze-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.16" />
        </filter>
      </defs>

      <g className="map-maze-grid" aria-hidden="true">
        {layout.grid.map((d, gridIndex) =>
          gridVisible.has(gridIndex) ? (
            <path key={`${rebuildKey}-g-${gridIndex}`} className="map-maze-grid-line" d={d} />
          ) : null,
        )}
      </g>

      <g className="map-maze-nuclei" aria-hidden="true">
        {layout.gridSeeds.map(([x, y], i) => {
          const born = elapsed > i * 30
          return born ? (
            <circle key={`${rebuildKey}-n-${i}`} className="map-maze-nucleus" cx={x} cy={y} r={2.4} />
          ) : null
        })}
      </g>

      {tracks.map((track) => {
        const focused = focusedLineCode === track.code
        const muted = focusedLineCode != null && !focused
        const moving = run && done && (focusedLineCode == null || focused)
        const stroke = muted ? undefined : track.color
        const park = `translate(${track.seedPoint[0]} ${track.seedPoint[1]})`
        const raw = done ? 1 : (elapsed - track.drawDelay) / track.drawMs
        const grown = easeOutCubic(raw)
        const branch = growFromSeed(track.points, track.seedIndex, grown)
        const rideD = branch.length >= 2 ? ortho(branch) : ""
        const showSeed = done || elapsed >= track.drawDelay
        const visibleStops = done
          ? track.stops
          : track.stops.filter(([x, y]) =>
              branch.some((p) => Math.hypot(p[0] - x, p[1] - y) < CELL * 0.55),
            )
        return (
          <g
            key={track.code}
            className={["map-maze-track", muted ? "is-muted" : "", focused ? "is-focused" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            {showSeed ? (
              <circle
                className="map-maze-origin"
                cx={track.seedPoint[0]}
                cy={track.seedPoint[1]}
                r={grown < 0.15 ? 5 : 3.4}
                style={stroke ? { fill: track.color } : undefined}
                opacity={muted ? 0.35 : grown < 1 ? 1 : 0.85}
              />
            ) : null}
            {rideD ? (
              <path
                className="map-maze-ride"
                d={rideD}
                style={{ stroke }}
                opacity={muted ? 0.26 : 1}
              />
            ) : null}
            <g className="map-maze-stops" aria-hidden="true">
              {visibleStops.map(([x, y], stopIndex) => (
                <circle
                  key={`${track.code}-${rebuildKey}-${stopIndex}`}
                  cx={x}
                  cy={y}
                  r={focused || focusedLineCode == null ? 3.2 : 2.4}
                  style={stroke ? { stroke } : undefined}
                />
              ))}
            </g>
            <g
              className="map-maze-car"
              filter="url(#map-maze-soft)"
              aria-hidden="true"
              transform={moving ? undefined : park}
              opacity={done ? (muted ? 0.45 : 1) : 0}
            >
              <g>
                {moving ? (
                  <animateMotion
                    key={`${track.code}-${track.color}-${rebuildKey}-run`}
                    dur={track.dur}
                    begin={focused ? "0s" : track.begin}
                    repeatCount="indefinite"
                    path={track.d}
                    rotate="auto"
                  />
                ) : null}
                <rect
                  x="-7"
                  y="-5.5"
                  width="14"
                  height="11"
                  rx="2.5"
                  style={stroke ? { fill: track.color } : undefined}
                />
                <rect x="-3.5" y="-2.5" width="3.5" height="4" rx="0.8" className="map-maze-window" />
                <rect x="0.5" y="-2.5" width="3.5" height="4" rx="0.8" className="map-maze-window" />
              </g>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
