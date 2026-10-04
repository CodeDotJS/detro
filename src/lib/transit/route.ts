import { normalizeJourney } from "../dmrc/normalize"
import type { Journey, Lang, Leg } from "./types"

export type LineSequence = {
  code: string
  show: boolean
  label: Record<Lang, { name: string; colorName: string; color: string }>
  stations: Array<{ code: string; names: Partial<Record<Lang, string>> }>
}

type Cost = {
  changes: number
  stops: number
}

type Hop = {
  station: string
  line: string
  kind: "board" | "ride" | "transfer"
}

export function rideSignature(journey: Journey): string {
  const coded = journey.legs.length > 0 && journey.legs.every((leg) => leg.stationCodes.length >= 2)
  if (coded) return journey.legs.map((leg) => leg.stationCodes.join("-")).join("|")
  return journey.legs.map((leg) => `${leg.lineName}:${leg.startName}:${leg.endName}`).join("|")
}

export function sameRide(a: Journey, b: Journey): boolean {
  return rideSignature(a) === rideSignature(b)
}

export function alternateRide(primary: Journey, other: Journey | null): Journey | null {
  if (!other || sameRide(primary, other)) return null
  return other
}

export function journeyFromSaved(
  routePayload: unknown | null,
  farePayload: unknown | null,
  trainsPayload: unknown | null,
  fetchedAt: string,
  criterion: Journey["criterion"] = "least-distance",
): Journey | null {
  if (routePayload == null) return null
  const normalized = normalizeJourney(routePayload, farePayload, fetchedAt, trainsPayload, criterion)
  return normalized.ok ? normalized.journey : null
}

export function resolveJourney(input: {
  savedRoute: unknown | null
  savedFare: unknown | null
  savedTrains?: unknown | null
  lines: LineSequence[]
  from: string
  to: string
  lang: Lang
  fetchedAt: string
}): Journey | null {
  if (input.savedRoute != null) {
    const normalized = normalizeJourney(input.savedRoute, input.savedFare, input.fetchedAt, input.savedTrains ?? null)
    if (normalized.ok) return normalized.journey
  }
  return planRoute(input.lines, input.from, input.to, input.lang, input.fetchedAt)
}

export function planRoute(
  lines: LineSequence[],
  from: string,
  to: string,
  lang: Lang,
  fetchedAt: string,
): Journey | null {
  if (from === to) return null
  const usable = lines.filter((line) => line.show && line.stations.length > 1)
  const byCode = new Map(usable.map((line) => [line.code, line]))
  const indexOnLine = new Map<string, Map<string, number>>()
  const linesAt = new Map<string, string[]>()
  for (const line of usable) {
    const indexes = new Map<string, number>()
    line.stations.forEach((station, index) => {
      if (!indexes.has(station.code)) indexes.set(station.code, index)
      const through = linesAt.get(station.code) ?? []
      through.push(line.code)
      linesAt.set(station.code, through)
    })
    indexOnLine.set(line.code, indexes)
  }
  for (const [station, through] of linesAt) {
    linesAt.set(station, [...new Set(through)].sort())
  }

  const startLines = linesAt.get(from) ?? []
  const destLines = new Set(linesAt.get(to) ?? [])
  if (startLines.length === 0 || destLines.size === 0) return null

  const dist = new Map<string, Cost>()
  const prev = new Map<string, Hop>()
  const queue: Array<{ station: string; line: string; cost: Cost }> = []

  for (const line of [...startLines].sort()) {
    const state = key(from, line)
    const cost = { changes: 0, stops: 0 }
    dist.set(state, cost)
    prev.set(state, { station: from, line, kind: "board" })
    queue.push({ station: from, line, cost })
  }

  let best: { station: string; line: string; cost: Cost } | null = null
  while (queue.length > 0) {
    queue.sort((a, b) => compareCost(a.cost, b.cost) || a.line.localeCompare(b.line) || a.station.localeCompare(b.station))
    const current = queue.shift()
    if (!current) break
    const currentKey = key(current.station, current.line)
    const known = dist.get(currentKey)
    if (!known || compareCost(current.cost, known) > 0) continue
    if (current.station === to) {
      best = current
      break
    }

    const line = byCode.get(current.line)
    const indexes = indexOnLine.get(current.line)
    if (!line || !indexes) continue
    const index = indexes.get(current.station)
    if (index === undefined) continue

    for (const nextIndex of [index - 1, index + 1]) {
      const next = line.stations[nextIndex]
      if (!next) continue
      relax(queue, dist, prev, current, next.code, current.line, { changes: current.cost.changes, stops: current.cost.stops + 1 }, "ride")
    }
    for (const other of linesAt.get(current.station) ?? []) {
      if (other === current.line) continue
      relax(queue, dist, prev, current, current.station, other, { changes: current.cost.changes + 1, stops: current.cost.stops }, "transfer")
    }
  }

  if (!best) return null
  const hops = walk(prev, best.station, best.line)
  const legs = toLegs(hops, byCode, lang)
  if (legs.length === 0) return null
  return {
    fetchedAt,
    criterion: "fewest-changes",
    originName: nameOf(byCode, hops[0].line, from, lang),
    destinationName: nameOf(byCode, best.line, to, lang),
    changes: Math.max(0, legs.length - 1),
    durationMinutes: null,
    fare: { kind: "unavailable" },
    trains: { first: null, last: null },
    legs,
  }
}

function relax(
  queue: Array<{ station: string; line: string; cost: Cost }>,
  dist: Map<string, Cost>,
  prev: Map<string, Hop>,
  current: { station: string; line: string },
  station: string,
  line: string,
  cost: Cost,
  kind: "ride" | "transfer",
) {
  const state = key(station, line)
  const known = dist.get(state)
  if (known && compareCost(cost, known) >= 0) return
  dist.set(state, cost)
  prev.set(state, { station: current.station, line: current.line, kind })
  queue.push({ station, line, cost })
}

function walk(prev: Map<string, Hop>, station: string, line: string): Hop[] {
  const hops: Hop[] = []
  let current: Hop = { station, line, kind: "ride" }
  const guard = new Set<string>()
  while (!guard.has(key(current.station, current.line))) {
    guard.add(key(current.station, current.line))
    hops.push(current)
    const earlier = prev.get(key(current.station, current.line))
    if (!earlier || earlier.kind === "board") break
    current = earlier
  }
  hops.reverse()
  return hops
}

function toLegs(hops: Hop[], byCode: Map<string, LineSequence>, lang: Lang): Leg[] {
  const legs: Leg[] = []
  let index = 0
  while (index < hops.length) {
    const lineCode = hops[index].line
    let end = index
    while (end + 1 < hops.length && hops[end + 1].line === lineCode) end += 1
    const line = byCode.get(lineCode)
    if (line && hops[index].station !== hops[end].station) {
      legs.push(makeLeg(line, hops[index].station, hops[end].station, byCode, lang))
    }
    if (end + 1 < hops.length && hops[end + 1].station === hops[end].station) {
      index = end + 1
    } else {
      break
    }
  }
  return legs
}

function makeLeg(
  line: LineSequence,
  from: string,
  to: string,
  byCode: Map<string, LineSequence>,
  lang: Lang,
): Leg {
  const codes = line.stations.map((station) => station.code)
  const startIndex = codes.indexOf(from)
  const endIndex = codes.indexOf(to)
  const towardEnd = endIndex > startIndex
  const terminal = line.stations[towardEnd ? line.stations.length - 1 : 0]
  const step = towardEnd ? 1 : -1
  const intermediate: string[] = []
  const stationCodes: string[] = []
  for (let cursor = startIndex; towardEnd ? cursor <= endIndex : cursor >= endIndex; cursor += step) {
    stationCodes.push(line.stations[cursor].code)
    if (cursor !== startIndex && cursor !== endIndex) {
      intermediate.push(stationName(line, line.stations[cursor].code, lang))
    }
  }
  const colorName = line.label[lang].colorName || line.label.en.colorName
  const sameColor = [...byCode.values()].filter((item) => (item.label[lang].colorName || item.label.en.colorName) === colorName)
  return {
    lineCode: line.code,
    lineName: sameColor.length > 1 ? `${colorName} (${line.code})` : colorName,
    towards: stationName(line, terminal.code, lang),
    platform: null,
    rideStops: Math.abs(endIndex - startIndex),
    startName: stationName(line, from, lang),
    endName: stationName(line, to, lang),
    intermediateNames: intermediate,
    stationCodes,
  }
}

function nameOf(byCode: Map<string, LineSequence>, lineCode: string, station: string, lang: Lang): string {
  const line = byCode.get(lineCode)
  return line ? stationName(line, station, lang) : station
}

function stationName(line: LineSequence, code: string, lang: Lang): string {
  const station = line.stations.find((item) => item.code === code)
  return station?.names[lang] ?? station?.names.en ?? code
}

function key(station: string, line: string): string {
  return `${station}\0${line}`
}

function compareCost(a: Cost, b: Cost): number {
  return a.changes - b.changes || a.stops - b.stops
}
