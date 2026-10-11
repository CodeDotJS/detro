import type { StationAccess } from "./classify"
import { nearestBoardable, type Coordinate } from "./nearest"
import type { StatusPack } from "./pack"

type AccessFn = (code: string) => StationAccess

export type Substitute = {
  from: string
  to: string
  replacedFrom: boolean
  replacedTo: boolean
}

export function allowSelectedEnds(from: string, to: string, access: AccessFn): AccessFn {
  return (code) => {
    const current = access(code)
    if (code === from) return { ...current, board: true }
    if (code === to) return { ...current, alight: true }
    return current
  }
}

export function substituteOpen(
  from: string,
  to: string,
  pack: StatusPack,
  coordinates: Record<string, Coordinate>,
  access: AccessFn,
): Substitute | null {
  let nextFrom = from
  let nextTo = to
  let replacedFrom = false
  let replacedTo = false
  if (!access(from).board) {
    const point = coordinates[from]
    const open = point ? nearestBoardable(point, pack, coordinates, from) : null
    if (!open) return null
    nextFrom = open.code
    replacedFrom = true
  }
  if (!access(to).alight) {
    const point = coordinates[to]
    const open = point ? nearestBoardable(point, pack, coordinates, to) : null
    if (!open) return null
    nextTo = open.code
    replacedTo = true
  }
  if (!replacedFrom && !replacedTo) return null
  if (nextFrom === nextTo) return null
  return { from: nextFrom, to: nextTo, replacedFrom, replacedTo }
}
