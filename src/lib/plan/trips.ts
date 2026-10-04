export type SavedTrip = {
  fromCode: string
  toCode: string
}

export type KeyValueStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const KEY = "dms-trips"
const LIMIT = 8

export function readTrips(store: KeyValueStore): SavedTrip[] {
  try {
    const raw = store.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTrip).slice(0, LIMIT)
  } catch {
    return []
  }
}

export function saveTrip(store: KeyValueStore, trip: SavedTrip): SavedTrip[] {
  const next = [trip, ...readTrips(store).filter((item) => !sameTrip(item, trip))].slice(0, LIMIT)
  store.setItem(KEY, JSON.stringify(next))
  return next
}

export function removeTrip(store: KeyValueStore, trip: SavedTrip): SavedTrip[] {
  const next = readTrips(store).filter((item) => !sameTrip(item, trip))
  if (next.length === 0) store.removeItem(KEY)
  else store.setItem(KEY, JSON.stringify(next))
  return next
}

export function clearTrips(store: KeyValueStore): void {
  store.removeItem(KEY)
}

export function tripQuery(fromCode: string, toCode: string): string {
  return `?from=${encodeURIComponent(fromCode)}&to=${encodeURIComponent(toCode)}`
}

export function readTripQuery(search: string): SavedTrip | null {
  const params = new URLSearchParams(search)
  const fromCode = params.get("from")
  const toCode = params.get("to")
  if (!fromCode || !toCode) return null
  if (!isCode(fromCode) || !isCode(toCode)) return null
  return { fromCode, toCode }
}

function isTrip(value: unknown): value is SavedTrip {
  if (!value || typeof value !== "object") return false
  const trip = value as SavedTrip
  return isCode(trip.fromCode) && isCode(trip.toCode)
}

function isCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9]+$/.test(value)
}

function sameTrip(a: SavedTrip, b: SavedTrip): boolean {
  return a.fromCode === b.fromCode && a.toCode === b.toCode
}
