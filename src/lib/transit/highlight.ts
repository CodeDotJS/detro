import type { Journey } from "./types"
import type { LineSequence } from "./route"

export function journeyStationCodes(journey: Journey): string[] {
  return journey.legs.flatMap((leg) => leg.stationCodes)
}

export function codesOnMap(routeCodes: string[], known: ReadonlySet<string>): string[] {
  const seen = new Set<string>()
  const found: string[] = []
  for (const code of routeCodes) {
    if (!known.has(code) || seen.has(code)) continue
    seen.add(code)
    found.push(code)
  }
  return found
}

export function bestLineForCodes(lines: LineSequence[], codes: string[], preferred: string | null): string | null {
  const wanted = new Set(codes)
  if (preferred && lines.some((line) => line.code === preferred && line.stations.some((station) => wanted.has(station.code)))) {
    return preferred
  }
  let best: { code: string; count: number } | null = null
  for (const line of lines) {
    if (!line.show) continue
    const count = line.stations.filter((station) => wanted.has(station.code)).length
    if (count === 0) continue
    if (!best || count > best.count) best = { code: line.code, count }
  }
  return best?.code ?? null
}
