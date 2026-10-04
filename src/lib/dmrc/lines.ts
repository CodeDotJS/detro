import type { LineChip } from "../transit/types"
import { lineListSchema, stationListSchema } from "./schemas"

export function visibleLineCodes(payload: unknown): string[] {
  const parsed = lineListSchema.safeParse(payload)
  if (!parsed.success) return []
  return parsed.data.filter((line) => line.show_in_frontend).map((line) => line.line_code)
}

export function buildLineIndex(
  lineList: unknown,
  groups: Array<{ lineCode: string; payload: unknown }>,
): Map<string, LineChip[]> {
  const parsedLines = lineListSchema.safeParse(lineList)
  const visible = new Map(
    (parsedLines.success ? parsedLines.data : [])
      .filter((line) => line.show_in_frontend)
      .map((line) => [line.line_code, line]),
  )
  const index = new Map<string, LineChip[]>()
  for (const group of groups) {
    const line = visible.get(group.lineCode)
    if (!line) continue
    const stations = stationListSchema.safeParse(group.payload)
    if (!stations.success) continue
    const chip: LineChip = {
      code: line.line_code,
      name: line.name,
      colorName: line.line_color,
      color: line.primary_color_code,
    }
    for (const station of stations.data) {
      const current = index.get(station.station_code) ?? []
      if (!current.some((item) => item.code === chip.code)) current.push(chip)
      index.set(station.station_code, current)
    }
  }
  return index
}
