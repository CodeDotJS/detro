export type LatLng = { lat: number; lng: number }

export function lineThreads(
  lines: Array<{ code: string; show: boolean; color: string; stationCodes: string[] }>,
  coordinates: Record<string, LatLng>,
): Array<{ code: string; color: string; points: [number, number][] }> {
  const threads: Array<{ code: string; color: string; points: [number, number][] }> = []
  for (const line of lines) {
    if (!line.show) continue
    let run: [number, number][] = []
    const flush = () => {
      if (run.length >= 2) threads.push({ code: line.code, color: line.color, points: run })
      run = []
    }
    for (const code of line.stationCodes) {
      const point = coordinates[code]
      if (!point) {
        flush()
        continue
      }
      run.push([point.lat, point.lng])
    }
    flush()
  }
  return threads
}

export function ridePath(
  stops: Array<{ code: string; stem: string | null }>,
  coordinates: Record<string, LatLng>,
): Array<{ color: string; points: [number, number][]; dashed: boolean }> {
  const parts: Array<{ color: string; points: [number, number][]; dashed: boolean }> = []
  let previous: { point: [number, number]; color: string } | null = null
  let gap = false
  for (const stop of stops) {
    const point = coordinates[stop.code]
    if (!point) {
      if (previous) gap = true
      continue
    }
    const here: [number, number] = [point.lat, point.lng]
    if (previous) {
      parts.push({
        color: previous.color,
        points: [previous.point, here],
        dashed: gap,
      })
    }
    if (stop.stem) previous = { point: here, color: stop.stem }
    else if (previous) previous = { point: here, color: previous.color }
    else previous = { point: here, color: "#16181d" }
    gap = false
  }
  return parts
}

export function routeSegments(
  stops: Array<{ code: string; stem: string | null }>,
  coordinates: Record<string, LatLng>,
): Array<{ color: string; points: [number, number][] }> {
  const segments: Array<{ color: string; points: [number, number][] }> = []
  let current: { color: string; points: [number, number][] } | null = null
  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = coordinates[stops[index].code]
    const to = coordinates[stops[index + 1].code]
    const color = stops[index].stem
    if (!from || !to || !color) {
      current = null
      continue
    }
    const start: [number, number] = [from.lat, from.lng]
    const end: [number, number] = [to.lat, to.lng]
    if (!current || current.color !== color) {
      current = { color, points: [start, end] }
      segments.push(current)
    } else {
      current.points.push(end)
    }
  }
  return segments
}
