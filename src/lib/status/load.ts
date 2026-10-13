import type { StatusPack, StatusStation, ServiceUpdate } from "./pack"
import { readHistory, type StatusHistory } from "./history"

const modules = import.meta.glob("../../../data/en/status.json", { eager: true, import: "default" }) as Record<
  string,
  unknown
>
const historyModules = import.meta.glob("../../../data/en/status-history.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>

export function loadStatus(): StatusPack {
  const raw = Object.values(modules)[0]
  return readPack(raw)
}

export function loadStatusHistory(): StatusHistory {
  const raw = Object.values(historyModules)[0]
  return readHistory(raw)
}

export function readPack(raw: unknown): StatusPack {
  if (!raw || typeof raw !== "object") return { fetchedAt: "", stations: {} }
  const row = raw as { fetchedAt?: unknown; stations?: unknown; serviceUpdate?: unknown }
  const fetchedAt = typeof row.fetchedAt === "string" ? row.fetchedAt : ""
  const stations: Record<string, StatusStation> = {}
  if (row.stations && typeof row.stations === "object") {
    for (const [code, value] of Object.entries(row.stations as Record<string, unknown>)) {
      const station = readStation(value)
      if (station) stations[code] = station
    }
  }
  const serviceUpdate = readServiceUpdate(row.serviceUpdate)
  return serviceUpdate ? { fetchedAt, stations, serviceUpdate } : { fetchedAt, stations }
}

export function statusClock(fetchedAt: string): string {
  if (!fetchedAt) return ""
  return fetchedAt.replace("T", " ").replace(/\.\d+$/, "")
}

/** Compact 12-hour clock for Status stats, e.g. `8:00 AM`. */
export function statusTime12(fetchedAt: string): string {
  const parts = readClockParts(fetchedAt)
  if (!parts) return ""
  return `${parts.hour12}:${parts.minute} ${parts.ampm}`
}

/** Date plus 12-hour clock for tooltips, e.g. `2026-10-13 8:00 AM`. */
export function statusStamp12(fetchedAt: string): string {
  const parts = readClockParts(fetchedAt)
  if (!parts) return statusClock(fetchedAt)
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour12}:${parts.minute} ${parts.ampm}`
}

function readClockParts(fetchedAt: string) {
  if (!fetchedAt) return null
  const match = fetchedAt.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?/)
  if (!match) return null
  const hour24 = Number(match[4])
  const ampm = hour24 >= 12 ? "PM" : "AM"
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return {
    year: match[1],
    month: match[2],
    day: match[3],
    minute: match[5],
    hour12: String(hour12),
    ampm,
  }
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

function readServiceUpdate(value: unknown): ServiceUpdate | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.title !== "string" || typeof row.text !== "string" || !row.text.trim()) return null
  return {
    title: row.title.trim() || "Service update",
    text: row.text.trim(),
    dated: typeof row.dated === "string" && row.dated.trim() ? row.dated.trim() : null,
    fetchedAt: typeof row.fetchedAt === "string" ? row.fetchedAt : "",
  }
}
