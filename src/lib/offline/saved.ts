import { journeyFromSaved } from "../transit/route"
import type { Journey } from "../transit/types"
import { SNAPSHOT_CACHE } from "./caches"
import { journeyFromPack, type PackRide } from "./pack"

export type PackFile = Record<string, { d?: PackRide; c?: PackRide }>

const packs = new Map<string, PackFile>()

export async function savedJourneys(
  from: string,
  to: string,
  names: Map<string, string>,
  fetchedAt: string,
): Promise<{ distance: Journey | null; changes: Journey | null }> {
  const pack = await originPack(from)
  if (pack) {
    const row = pack[to]
    return {
      distance: row?.d ? journeyFromPack(row.d, names, fetchedAt, "least-distance") : null,
      changes: row?.c ? journeyFromPack(row.c, names, fetchedAt, "fewest-changes") : null,
    }
  }
  const [distance, changes] = await Promise.all([
    bundle("least-distance", from, to, fetchedAt),
    bundle("minimum-interchange", from, to, fetchedAt, "fewest-changes"),
  ])
  return { distance, changes }
}

const JOURNEY_PATH = /^\/snapshot\/en\/journeys\/([^/]+)\.json$/

/** Starting stations whose journey pack is already in the offline cache, or null when the cache cannot be read. */
export async function cachedJourneyOrigins(): Promise<Set<string> | null> {
  if (!("caches" in globalThis)) return null
  try {
    const cache = await caches.open(SNAPSHOT_CACHE)
    const out = new Set<string>()
    for (const request of await cache.keys()) {
      const match = JOURNEY_PATH.exec(new URL(request.url).pathname)
      if (match) out.add(decodeURIComponent(match[1]))
    }
    return out
  } catch {
    return null
  }
}

/** Every saved trip that starts at this station, or null when the pack is not on this phone. */
export async function savedOriginPack(from: string): Promise<PackFile | null> {
  return originPack(from)
}

/** Distinct weekday fares saved for trips that start at this station. */
export async function savedWeekdayFares(from: string): Promise<number[]> {
  const pack = await originPack(from)
  if (!pack) return []
  const fares = new Set<number>()
  for (const row of Object.values(pack)) {
    const fare = row.d?.w
    if (typeof fare === "number" && fare > 0) fares.add(fare)
  }
  return [...fares].sort((a, b) => a - b)
}

async function originPack(from: string): Promise<PackFile | null> {
  const cached = packs.get(from)
  if (cached) return cached
  const payload = await readSnapshotJson(`/snapshot/en/journeys/${encodeURIComponent(from)}.json`)
  if (!payload || typeof payload !== "object") return null
  const pack = payload as PackFile
  packs.set(from, pack)
  return pack
}

async function bundle(
  mode: "least-distance" | "minimum-interchange",
  from: string,
  to: string,
  fetchedAt: string,
  criterion: Journey["criterion"] = "least-distance",
): Promise<Journey | null> {
  const encoded = `${encodeURIComponent(from)}/${encodeURIComponent(to)}.json`
  const route = await readSnapshotJson(`/snapshot/en/routes/${mode}/${encoded}`)
  if (route == null) return null
  const [fare, trains] = await Promise.all([
    readSnapshotJson(`/snapshot/en/fares/${mode}/${encoded}`),
    readSnapshotJson(`/snapshot/en/first-last/${mode}/${encoded}`),
  ])
  return journeyFromSaved(route, fare, trains, fetchedAt, criterion)
}

async function readSnapshotJson(url: string): Promise<unknown | null> {
  const response = await readSnapshot(url)
  if (!response) return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function readSnapshot(url: string): Promise<Response | null> {
  try {
    const response = await fetch(url)
    if (response.ok) return response
  } catch {
    // The network is down. The saved pack may still be on this phone.
  }
  if (!("caches" in globalThis)) return null
  try {
    const cache = await caches.open(SNAPSHOT_CACHE)
    const cached = await cache.match(url)
    return cached?.ok ? cached : null
  } catch {
    return null
  }
}
