export type HistoryStation = { code: string; name: string }

export type HistoryDay = {
  date: string
  count: number
  stations: HistoryStation[]
}

export type StatusHistory = {
  days: HistoryDay[]
}

export type HistoryRange = "all" | "week" | "month" | "year" | number

export type HistoryRangeOption =
  | { value: "all"; labelKey: "all" }
  | { value: "week"; labelKey: "week" }
  | { value: "month"; labelKey: "month" }
  | { value: "year"; labelKey: "year" }
  | { value: number; labelKey: "calendar"; year: number }

export function readHistory(raw: unknown): StatusHistory {
  if (!raw || typeof raw !== "object") return { days: [] }
  const row = raw as { days?: unknown }
  if (!Array.isArray(row.days)) return { days: [] }
  const days: HistoryDay[] = []
  for (const item of row.days) {
    const day = readDay(item)
    if (day) days.push(day)
  }
  days.sort((a, b) => a.date.localeCompare(b.date))
  return { days }
}

export function historyYears(history: StatusHistory): number[] {
  const years = new Set<number>()
  for (const day of history.days) {
    const year = Number(day.date.slice(0, 4))
    if (Number.isFinite(year)) years.add(year)
  }
  return [...years].sort((a, b) => b - a)
}

/** Only ranges the packed history can meaningfully support. */
export function historyRangeOptions(history: StatusHistory, today = todayStamp()): HistoryRangeOption[] {
  if (history.days.length === 0) return []
  const earliest = history.days[0]?.date
  if (!earliest) return []
  const years = historyYears(history)
  const options: HistoryRangeOption[] = [{ value: "all", labelKey: "all" }]
  if (earliest <= shiftStamp(today, -6)) options.push({ value: "week", labelKey: "week" })
  if (earliest <= shiftStamp(today, -29)) options.push({ value: "month", labelKey: "month" })
  if (earliest <= shiftStamp(today, -365)) options.push({ value: "year", labelKey: "year" })
  for (const year of years) options.push({ value: year, labelKey: "calendar", year })
  return options
}

export function formatHistoryDate(stamp: string, withYear = false): string {
  const date = parseStamp(stamp)
  if (!date) return stamp
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  }).format(date)
}

export function filterHistory(
  history: StatusHistory,
  range: HistoryRange,
  today = todayStamp(),
): HistoryDay[] {
  if (range === "all") return [...history.days]
  if (typeof range === "number") {
    const prefix = String(range)
    return history.days.filter((day) => day.date.startsWith(prefix))
  }
  const end = parseStamp(today)
  if (!end) return [...history.days]
  const start = new Date(end)
  if (range === "week") start.setUTCDate(start.getUTCDate() - 6)
  else if (range === "month") start.setUTCDate(start.getUTCDate() - 29)
  else start.setUTCFullYear(start.getUTCFullYear() - 1)
  const from = stampOf(start)
  return history.days.filter((day) => day.date >= from && day.date <= today)
}

export function chartSeries(
  history: StatusHistory,
  range: HistoryRange,
  today = todayStamp(),
): Array<{ date: string; count: number }> {
  const filtered = filterHistory(history, range, today)
  if (range === "all" || typeof range === "number") {
    return filtered.map((day) => ({ date: day.date, count: day.count }))
  }
  const byDate = new Map(history.days.map((day) => [day.date, day.count]))
  const end = parseStamp(today)
  if (!end) return filtered.map((day) => ({ date: day.date, count: day.count }))
  const start = new Date(end)
  if (range === "week") start.setUTCDate(start.getUTCDate() - 6)
  else if (range === "month") start.setUTCDate(start.getUTCDate() - 29)
  else start.setUTCFullYear(start.getUTCFullYear() - 1)
  const series: Array<{ date: string; count: number }> = []
  for (let cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = stampOf(cursor)
    series.push({ date, count: byDate.get(date) ?? 0 })
  }
  return series
}

export function todayStamp(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function shiftStamp(stamp: string, dayDelta: number): string {
  const date = parseStamp(stamp)
  if (!date) return stamp
  date.setUTCDate(date.getUTCDate() + dayDelta)
  return stampOf(date)
}

function readDay(raw: unknown): HistoryDay | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as { date?: unknown; stations?: unknown }
  if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return null
  const stations: HistoryStation[] = []
  if (Array.isArray(row.stations)) {
    for (const item of row.stations) {
      if (!item || typeof item !== "object") continue
      const stop = item as { code?: unknown; name?: unknown }
      if (typeof stop.code !== "string" || !stop.code) continue
      if (typeof stop.name !== "string" || !stop.name) continue
      stations.push({ code: stop.code, name: stop.name })
    }
  }
  stations.sort((a, b) => a.code.localeCompare(b.code))
  return { date: row.date, count: stations.length, stations }
}

function parseStamp(stamp: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return null
  return new Date(`${stamp}T00:00:00.000Z`)
}

function stampOf(date: Date): string {
  return date.toISOString().slice(0, 10)
}
