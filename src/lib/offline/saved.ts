import { journeyFromSaved } from "../transit/route"
import type { Journey } from "../transit/types"
import { journeyFromPack, type PackRide } from "./pack"

type PackFile = Record<string, { d?: PackRide; c?: PackRide }>

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
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}
