import { parseStationBrief, type StationBrief } from "./brief"

const briefs = new Map<string, StationBrief>()
for (const [file, payload] of Object.entries(
  import.meta.glob("../../../data/en/station_brief/*.json", { eager: true, import: "default" }),
)) {
  const parsed = parseStationBrief(payload)
  if (!parsed) continue
  briefs.set(parsed.code, parsed)
  const fromName = file.split("/").pop()?.replace(/\.json$/, "")
  if (fromName) briefs.set(fromName, parsed)
}

export function stationBrief(code: string): StationBrief | null {
  return briefs.get(code) ?? null
}
