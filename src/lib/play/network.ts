import type { LineSequence } from "../transit/route"

export type GameLine = {
  code: string
  name: string
  color: string
  codes: string[]
}

export type Point = { lat: number; lng: number }

export type GameNetwork = {
  lines: GameLine[]
  byCode: Map<string, GameLine>
  names: Map<string, string>
  linesAt: Map<string, string[]>
  coords: Map<string, Point>
  stationCount: number
}

export function buildGameNetwork(lines: LineSequence[], coords: Record<string, Point> = {}): GameNetwork {
  const usable: GameLine[] = []
  const names = new Map<string, string>()
  const linesAt = new Map<string, string[]>()
  for (const line of lines) {
    if (!line.show) continue
    const codes: string[] = []
    for (const station of line.stations) {
      if (codes.includes(station.code)) continue
      codes.push(station.code)
      if (!names.has(station.code)) names.set(station.code, station.names.en ?? station.code)
    }
    if (codes.length < 2) continue
    usable.push({
      code: line.code,
      name: line.label.en.colorName || line.code,
      color: line.label.en.color || "#5c6570",
      codes,
    })
    for (const code of codes) {
      const through = linesAt.get(code) ?? []
      if (!through.includes(line.code)) through.push(line.code)
      linesAt.set(code, through)
    }
  }
  const known = new Map<string, Point>()
  for (const [code, point] of Object.entries(coords)) {
    if (names.has(code) && Number.isFinite(point?.lat) && Number.isFinite(point?.lng)) known.set(code, point)
  }
  return {
    lines: usable,
    byCode: new Map(usable.map((line) => [line.code, line])),
    names,
    linesAt,
    coords: known,
    stationCount: names.size,
  }
}

export function stationName(network: GameNetwork, code: string): string {
  return network.names.get(code) ?? code
}

/** Other lines at a station, leaving out lines that share the ride line's name. */
export function otherLinesAt(network: GameNetwork, code: string, lineCode: string): GameLine[] {
  const ride = network.byCode.get(lineCode)
  return (network.linesAt.get(code) ?? [])
    .filter((other) => other !== lineCode)
    .map((other) => network.byCode.get(other))
    .filter((line): line is GameLine => Boolean(line) && line!.name !== ride?.name)
}
