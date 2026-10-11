import { accessByCode, type StatusPack } from "./pack"
import { haversineKm, nearestBoardable, type Coordinate } from "./nearest"
import type { LineSequence } from "../transit/route"

export type GateKind = "before" | "after" | "near"

export type GatePick = {
  code: string
  km: number | null
  kind: GateKind
  lineCode: string | null
}

export function openGatesAround(
  closed: string,
  pack: StatusPack,
  lines: LineSequence[],
  coordinates: Record<string, Coordinate>,
  from?: Coordinate,
): GatePick[] {
  const found = new Map<string, GatePick>()
  const origin = from ?? coordinates[closed]

  function add(code: string, kind: GateKind, lineCode: string | null) {
    if (code === closed || found.has(code)) return
    if (!accessByCode(pack, code).board) return
    const point = coordinates[code]
    found.set(code, {
      code,
      km: origin && point ? haversineKm(origin, point) : null,
      kind,
      lineCode,
    })
  }

  for (const line of lines) {
    const index = line.stations.findIndex((stop) => stop.code === closed)
    if (index < 0) continue
    for (let i = index - 1; i >= 0; i -= 1) {
      if (accessByCode(pack, line.stations[i].code).board) {
        add(line.stations[i].code, "before", line.code)
        break
      }
    }
    for (let i = index + 1; i < line.stations.length; i += 1) {
      if (accessByCode(pack, line.stations[i].code).board) {
        add(line.stations[i].code, "after", line.code)
        break
      }
    }
  }

  if (origin) {
    const near = nearestBoardable(origin, pack, coordinates, closed)
    if (near) add(near.code, "near", null)
  }

  const ranked = [...found.values()].sort((a, b) => {
    const rank = (kind: GateKind) => (kind === "before" ? 0 : kind === "after" ? 1 : 2)
    const byKind = rank(a.kind) - rank(b.kind)
    if (byKind !== 0) return byKind
    return (a.km ?? 99) - (b.km ?? 99)
  })
  return ranked.slice(0, 4)
}

export function nearestOpen(
  closed: string,
  pack: StatusPack,
  lines: LineSequence[],
  coordinates: Record<string, Coordinate>,
  here?: Coordinate | null,
): { code: string; km: number | null } | null {
  const origin = here ?? coordinates[closed] ?? null
  if (origin) {
    const next = nearestBoardable(origin, pack, coordinates, closed)
    if (next) return next
  }
  const along = openGatesAround(closed, pack, lines, coordinates, origin ?? undefined)
  const pick = along.find((item) => item.kind === "before" || item.kind === "after") ?? along[0]
  if (!pick) return null
  return { code: pick.code, km: pick.km }
}
