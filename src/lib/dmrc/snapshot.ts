import type { LineSequence } from "../transit/route"
import type { Lang, LineChip, Suggestion } from "../transit/types"
import { lineListSchema, stationListSchema } from "./schemas"

const RESULT_LIMIT = 30

export type CatalogStation = {
  code: string
  names: Partial<Record<Lang, string>>
  lines: Record<Lang, LineChip[]>
}

export type StationSnapshot = {
  fetchedAt: string
  stations: CatalogStation[]
  lines: LineSequence[]
}

type StationGroup = {
  lineCode: string
  payload: unknown
}

const modules = {
  ...import.meta.glob("../../../data/manifest.json", { eager: true, import: "default" }),
  ...import.meta.glob("../../../data/en/line_list.json", { eager: true, import: "default" }),
  ...import.meta.glob("../../../data/en/stations/*.json", { eager: true, import: "default" }),
} as Record<string, unknown>

export function loadSnapshot(): StationSnapshot {
  const enLines = readFile("/en/line_list.json")
  const enStations = stationGroups("en")
  return {
    fetchedAt: readFetchedAt(readFile("/manifest.json")),
    stations: buildCatalog({ enLines, hiLines: [], enStations, hiStations: [] }),
    lines: buildLineSequences({ enLines, hiLines: [], enStations, hiStations: [] }),
  }
}

export function buildLineSequences(input: {
  enLines: unknown
  hiLines: unknown
  enStations: StationGroup[]
  hiStations: StationGroup[]
}): LineSequence[] {
  const english = lineListSchema.safeParse(input.enLines)
  const hindi = lineListSchema.safeParse(input.hiLines)
  const hiByCode = new Map((hindi.success ? hindi.data : []).map((line) => [line.line_code, line]))
  if (!english.success) return []
  return english.data.map((line) => {
    const hiLine = hiByCode.get(line.line_code)
    const enStations = stationsFor(input.enStations, line.line_code)
    const hiNames = new Map(stationsFor(input.hiStations, line.line_code).map((station) => [station.station_code, station.station_name]))
    return {
      code: line.line_code,
      show: line.show_in_frontend,
      label: {
        en: { name: line.name, colorName: line.line_color, color: line.primary_color_code },
        hi: {
          name: hiLine?.name ?? line.name,
          colorName: hiLine?.line_color ?? line.line_color,
          color: hiLine?.primary_color_code ?? line.primary_color_code,
        },
      },
      stations: enStations.map((station) => ({
        code: station.station_code,
        names: { en: station.station_name, hi: hiNames.get(station.station_code) },
      })),
    }
  })
}

function stationsFor(groups: StationGroup[], lineCode: string) {
  const group = groups.find((item) => item.lineCode === lineCode)
  const parsed = stationListSchema.safeParse(group?.payload)
  return parsed.success ? parsed.data : []
}

export function buildCatalog(input: {
  enLines: unknown
  hiLines: unknown
  enStations: StationGroup[]
  hiStations: StationGroup[]
}): CatalogStation[] {
  const english = indexLanguage(input.enLines, input.enStations)
  const hindi = indexLanguage(input.hiLines, input.hiStations)
  const codes = new Set([...english.keys(), ...hindi.keys()])
  return [...codes]
    .map((code) => ({
      code,
      names: {
        en: english.get(code)?.name,
        hi: hindi.get(code)?.name,
      },
      lines: {
        en: english.get(code)?.lines ?? [],
        hi: hindi.get(code)?.lines ?? [],
      },
    }))
    .sort((a, b) => displayName(a, "en").localeCompare(displayName(b, "en")))
}

export function searchCatalog(stations: CatalogStation[], lang: Lang, query: string): Suggestion[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  const hits = stations
    .filter((station) => matches(station, needle))
    .map((station) => {
      const name = displayName(station, lang)
      const prefix =
        name.toLocaleLowerCase().startsWith(needle) || station.code.toLocaleLowerCase().startsWith(needle)
      return { station, name, prefix }
    })
  hits.sort((a, b) => Number(b.prefix) - Number(a.prefix) || a.name.localeCompare(b.name))
  return hits.slice(0, RESULT_LIMIT).map((hit) => ({
    code: hit.station.code,
    name: hit.name,
    lines: hit.station.lines[lang].length > 0 ? hit.station.lines[lang] : hit.station.lines.en,
  }))
}

export function lineIndexFor(stations: CatalogStation[], lang: Lang): Map<string, LineChip[]> {
  return new Map(
    stations.map((station) => [
      station.code,
      station.lines[lang].length > 0 ? station.lines[lang] : station.lines.en,
    ]),
  )
}

export function namesFor(stations: CatalogStation[], lang: Lang): Map<string, string> {
  return new Map(stations.map((station) => [station.code, displayName(station, lang)]))
}

function indexLanguage(lineList: unknown, groups: StationGroup[]) {
  const parsedLines = lineListSchema.safeParse(lineList)
  const visible = new Map(
    (parsedLines.success ? parsedLines.data : [])
      .filter((line) => line.show_in_frontend)
      .map((line) => [line.line_code, line]),
  )
  const byCode = new Map<string, { name: string; lines: LineChip[] }>()
  const ordered = [...groups].sort((a, b) => a.lineCode.localeCompare(b.lineCode))
  for (const group of ordered) {
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
      const current = byCode.get(station.station_code) ?? { name: station.station_name, lines: [] }
      if (!current.lines.some((item) => item.code === chip.code)) current.lines.push(chip)
      byCode.set(station.station_code, current)
    }
  }
  return byCode
}

function matches(station: CatalogStation, needle: string): boolean {
  if (station.code.toLocaleLowerCase().includes(needle)) return true
  return Object.values(station.names).some((name) => name?.toLocaleLowerCase().includes(needle))
}

function displayName(station: CatalogStation, lang: Lang): string {
  return station.names[lang] ?? station.names.en ?? station.code
}

function stationGroups(lang: Lang): StationGroup[] {
  const marker = `/${lang}/stations/`
  const groups: StationGroup[] = []
  for (const [path, payload] of Object.entries(modules)) {
    const normalized = path.replaceAll("\\", "/")
    const index = normalized.indexOf(marker)
    if (index === -1 || !normalized.endsWith(".json")) continue
    const fileName = normalized.slice(index + marker.length)
    groups.push({ lineCode: fileName.slice(0, -".json".length), payload })
  }
  return groups
}

function readFile(suffix: string): unknown {
  const found = Object.entries(modules).find(([path]) => path.replaceAll("\\", "/").endsWith(suffix))
  if (!found) throw new Error(`Missing snapshot file ${suffix}`)
  return found[1]
}

function readFetchedAt(payload: unknown): string {
  if (payload && typeof payload === "object" && "fetchedAt" in payload) {
    const value = payload.fetchedAt
    if (typeof value === "string") return value
  }
  return ""
}
