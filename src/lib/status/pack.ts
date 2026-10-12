import { accessFor, mergeNotes, openAccess, type StationAccess } from "./classify"

export type StatusStation = {
  phrase: string
  note: string | null
  title: string | null
  start: string | null
  end: string | null
  lineCodes: string[]
}

export type ServiceUpdate = {
  title: string
  text: string
  dated: string | null
  fetchedAt: string
}

export type StatusPack = {
  fetchedAt: string
  stations: Record<string, StatusStation>
  serviceUpdate?: ServiceUpdate | null
}

export type StatusLineInput = {
  code: string
  metro: unknown
  linepage: unknown
}

type UpdateRow = {
  station?: { station_code?: string; station_name?: string }
  note?: string
  title?: string
  start_date?: string
  end_date?: string
  activate?: boolean
}

export function packStatus(fetchedAt: string, lines: StatusLineInput[]): StatusPack {
  const stations: Record<string, StatusStation> = {}
  const notes = new Map<string, string[]>()

  for (const line of lines) {
    const updates = stationUpdates(line.metro)
    for (const row of updates) {
      const code = row.station?.station_code
      if (!code) continue
      const list = notes.get(code) ?? []
      if (row.note) list.push(row.note)
      notes.set(code, list)
      const current = stations[code]
      stations[code] = {
        phrase: current?.phrase ?? "Station Closed",
        note: current?.note ?? row.note ?? null,
        title: row.title ?? current?.title ?? null,
        start: row.start_date ?? current?.start ?? null,
        end: row.end_date ?? current?.end ?? null,
        lineCodes: unique([...(current?.lineCodes ?? []), line.code]),
      }
    }

    for (const row of stationRows(line.linepage)) {
      if (row.status !== "Station Closed") continue
      const current = stations[row.code]
      const extra = notes.get(row.code) ?? []
      const note = current?.note ?? extra[0] ?? null
      stations[row.code] = {
        phrase: "Station Closed",
        note,
        title: current?.title ?? null,
        start: current?.start ?? null,
        end: current?.end ?? null,
        lineCodes: unique([...(current?.lineCodes ?? []), line.code]),
      }
    }
  }

  for (const [code, station] of Object.entries(stations)) {
    const merged = mergeNotes(notes.get(code) ?? (station.note ? [station.note] : []))
    if (merged !== "silent" && (notes.get(code)?.length ?? 0) > 0) {
      station.note = (notes.get(code) ?? []).find((item) => {
        if (merged === "unavailable") return /will not be available/i.test(item)
        return /interchange facility is available/i.test(item)
      }) ?? station.note
    }
  }

  return { fetchedAt, stations }
}

export function accessByCode(pack: StatusPack, code: string): StationAccess {
  const station = pack.stations[code]
  if (!station) return openAccess
  return accessFor(station.phrase, station.note)
}

function stationRows(linepage: unknown): Array<{ code: string; status: string }> {
  if (!Array.isArray(linepage)) return []
  return linepage.flatMap((item) => {
    if (!item || typeof item !== "object" || !("station_code" in item)) return []
    const row = item as { station_code: unknown; status?: unknown }
    if (typeof row.station_code !== "string") return []
    return [{ code: row.station_code, status: typeof row.status === "string" ? row.status : "" }]
  })
}

function stationUpdates(metro: unknown): UpdateRow[] {
  if (!Array.isArray(metro) || metro.length < 2) return []
  const block = metro[1] as { stations_updates?: unknown }
  if (!Array.isArray(block.stations_updates)) return []
  return block.stations_updates.filter((row): row is UpdateRow => !!row && typeof row === "object")
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}
