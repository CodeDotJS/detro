import { z } from "zod"
import type { Journey, Lang, LineChip } from "../transit/types"
import { readLineCache, writeLineCache } from "./cache"
import { DmrcError } from "./errors"
import { buildLineIndex, visibleLineCodes } from "./lines"
import { normalizeJourney } from "./normalize"
import { parseDmrcResponse } from "./parse"
import { farePath, keywordPath, lineListPath, stationRoutePath, stationsOnLinePath } from "./paths"
import { stationSchema } from "./schemas"
import { formatKolkataTimestamp } from "./time"

const BASE = "https://backend.delhimetrorail.com/api/v2"
const TIMEOUT_MS = 8000

export type DmrcFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export function createDmrcClient(fetchImpl: DmrcFetch = fetch, now: () => Date = () => new Date()) {
  const inflight = new Map<string, Promise<unknown>>()
  const indexInflight = new Map<Lang, Promise<Map<string, LineChip[]>>>()

  function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
    if (!signal) {
      const existing = inflight.get(path)
      if (existing) return existing
    }
    const promise = request(path, signal).finally(() => {
      if (!signal) inflight.delete(path)
    })
    if (!signal) inflight.set(path, promise)
    return promise
  }

  async function request(path: string, signal?: AbortSignal): Promise<unknown> {
    const timeout = new AbortController()
    const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS)
    const onAbort = () => timeout.abort()
    signal?.addEventListener("abort", onAbort)
    try {
      const response = await fetchImpl(`${BASE}${path}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: timeout.signal,
      })
      return await parseDmrcResponse(response)
    } catch (error) {
      if (error instanceof DmrcError) throw error
      if (signal?.aborted) throw new DmrcError("aborted", "The request was cancelled.")
      if (timeout.signal.aborted) throw new DmrcError("timeout", "The planner took too long.")
      throw new DmrcError("network", "The planner could not be reached.")
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
    }
  }

  async function fetchIndex(lang: Lang): Promise<Map<string, LineChip[]>> {
    const payload = await getJson(lineListPath(lang))
    const codes = visibleLineCodes(payload)
    const groups = (
      await Promise.all(
        codes.map(async (lineCode) => {
          try {
            const body = await getJson(stationsOnLinePath(lang, lineCode))
            return { lineCode, payload: body }
          } catch {
            return null
          }
        }),
      )
    ).filter((group): group is { lineCode: string; payload: unknown } => group !== null)
    return buildLineIndex(payload, groups)
  }

  return {
    async searchStations(keyword: string, lang: Lang, signal?: AbortSignal) {
      const payload = await getJson(keywordPath(lang, keyword), signal)
      const parsed = z.array(stationSchema).safeParse(payload)
      if (!parsed.success) {
        throw new DmrcError("schema", "Station search did not match the expected shape.")
      }
      return parsed.data.map((station) => ({
        code: station.station_code,
        name: station.station_name,
      }))
    },

    async planJourney(from: string, to: string, lang: Lang, signal?: AbortSignal): Promise<Journey> {
      const stamp = formatKolkataTimestamp(now())
      const routePayload = await getJson(stationRoutePath(lang, from, to, stamp), signal)
      let farePayload: unknown | null = null
      try {
        farePayload = await getJson(farePath(lang, from, to), signal)
      } catch {
        farePayload = null
      }
      const normalized = normalizeJourney(routePayload, farePayload, now().toISOString())
      if (!normalized.ok) {
        throw new DmrcError("schema", "The journey did not include a route.")
      }
      return normalized.journey
    },

    loadLineIndex(lang: Lang): Promise<Map<string, LineChip[]>> {
      const cached = readLineCache(lang)
      if (cached) return Promise.resolve(cached)
      const pending = indexInflight.get(lang)
      if (pending) return pending
      const promise = fetchIndex(lang)
        .then((index) => {
          writeLineCache(lang, index)
          return index
        })
        .finally(() => {
          indexInflight.delete(lang)
        })
      indexInflight.set(lang, promise)
      return promise
    },
  }
}

export const dmrcClient = createDmrcClient()
