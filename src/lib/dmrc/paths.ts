import type { Lang } from "../transit/types"

export function stationRoutePath(lang: Lang, from: string, to: string, timestamp: string): string {
  return `/${encodeURIComponent(lang)}/station_route/${encodeURIComponent(from)}/${encodeURIComponent(to)}/least-distance/${timestamp}`
}

export function keywordPath(lang: Lang, keyword: string): string {
  return `/${encodeURIComponent(lang)}/station_by_keyword/all/${encodeURIComponent(keyword)}`
}

export function farePath(lang: Lang, from: string, to: string): string {
  return `/${encodeURIComponent(lang)}/new_fare_with_route/${encodeURIComponent(from)}/${encodeURIComponent(to)}/least-distance/`
}

export function lineListPath(lang: Lang): string {
  return `/${encodeURIComponent(lang)}/line_list`
}

export function stationsOnLinePath(lang: Lang, lineCode: string): string {
  return `/${encodeURIComponent(lang)}/station_by_line/${encodeURIComponent(lineCode)}`
}
