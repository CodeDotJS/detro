import { matchingLine } from "./legStyle"
import type { LineSequence } from "./route"
import type { Journey, Lang } from "./types"

export type RouteStop = {
  code: string
  name: string
  dot: string
  stem: string | null
  change: boolean
}

export function routeStops(journey: Journey, lines: LineSequence[], lang: Lang): RouteStop[] {
  const stops: RouteStop[] = []
  for (const leg of journey.legs) {
    const line = matchingLine(leg, lines, lang)
    const color = line?.label.en.color || "#5c6570"
    const names = [leg.startName, ...leg.intermediateNames, leg.endName].filter((name) => name.trim() !== "")
    const count = Math.max(leg.stationCodes.length, names.length)
    for (let index = 0; index < count; index += 1) {
      const code = leg.stationCodes[index] ?? ""
      const listed = code ? line?.stations.find((station) => station.code === code) : undefined
      const name = names[index] || listed?.names[lang] || listed?.names.en || code
      if (!name) continue
      const previous = stops[stops.length - 1]
      if (previous && code && previous.code === code) {
        previous.change = true
        previous.stem = color
        continue
      }
      stops.push({ code, name, dot: color, stem: color, change: false })
    }
  }
  if (stops.length > 0) stops[stops.length - 1].stem = null
  return stops
}

export function startLineCode(lines: LineSequence[], journey: Journey): string | null {
  const codes = new Set(journey.legs[0]?.stationCodes ?? [])
  if (codes.size === 0) return null
  let best: { code: string; count: number } | null = null
  for (const line of lines) {
    if (!line.show) continue
    const count = line.stations.filter((station) => codes.has(station.code)).length
    if (count === 0) continue
    if (!best || count > best.count) best = { code: line.code, count }
  }
  return best?.code ?? null
}
