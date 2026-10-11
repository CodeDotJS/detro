import type { StatusPack, StatusStation } from "./pack"

const modules = import.meta.glob("../../../data/en/status.json", { eager: true, import: "default" }) as Record<
  string,
  unknown
>

export function loadStatus(): StatusPack {
  const raw = Object.values(modules)[0]
  return readPack(raw)
}

export function readPack(raw: unknown): StatusPack {
  if (!raw || typeof raw !== "object") return { fetchedAt: "", stations: {} }
  const row = raw as { fetchedAt?: unknown; stations?: unknown }
  const fetchedAt = typeof row.fetchedAt === "string" ? row.fetchedAt : ""
  const stations: Record<string, StatusStation> = {}
  if (row.stations && typeof row.stations === "object") {
    for (const [code, value] of Object.entries(row.stations as Record<string, unknown>)) {
      const station = readStation(value)
      if (station) stations[code] = station
    }
  }
  return { fetchedAt, stations }
}

export function statusClock(fetchedAt: string): string {
  if (!fetchedAt) return ""
  return fetchedAt.replace("T", " ").replace(/\.\d+$/, "")
}

function readStation(value: unknown): StatusStation | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.phrase !== "string") return null
  return {
    phrase: row.phrase,
    note: typeof row.note === "string" ? row.note : null,
    title: typeof row.title === "string" ? row.title : null,
    start: typeof row.start === "string" ? row.start : null,
    end: typeof row.end === "string" ? row.end : null,
    lineCodes: Array.isArray(row.lineCodes) ? row.lineCodes.filter((item): item is string => typeof item === "string") : [],
  }
}
