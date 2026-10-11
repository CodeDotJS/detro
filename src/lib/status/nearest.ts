import { accessByCode, type StatusPack } from "./pack"

export type Coordinate = { lat: number; lng: number }

export function nearestStation(
  from: Coordinate,
  coordinates: Record<string, Coordinate>,
  exclude = "",
): { code: string; km: number } | null {
  let best: { code: string; km: number } | null = null
  for (const [code, point] of Object.entries(coordinates)) {
    if (code === exclude) continue
    const km = haversineKm(from, point)
    if (!best || km < best.km) best = { code, km }
  }
  return best
}

export function nearestBoardable(
  from: Coordinate,
  pack: StatusPack,
  coordinates: Record<string, Coordinate>,
  exclude: string,
): { code: string; km: number } | null {
  let best: { code: string; km: number } | null = null
  for (const [code, point] of Object.entries(coordinates)) {
    if (code === exclude) continue
    if (!accessByCode(pack, code).board) continue
    const km = haversineKm(from, point)
    if (!best || km < best.km) best = { code, km }
  }
  return best
}

export function haversineKm(a: Coordinate, b: Coordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earth = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)))
}
