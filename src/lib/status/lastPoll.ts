/** Trial: last successful Status bake dispatch from the Cloudflare ping Worker. */
export const STATUS_PING_URL = "https://detro-status-ping.rushforlinux.workers.dev"

let sessionPoll: Promise<string | null> | null = null

export function readLastPollPayload(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null
  const polledAt = (raw as { polledAt?: unknown }).polledAt
  return typeof polledAt === "string" && polledAt.trim() ? polledAt.trim() : null
}

export async function fetchLastPoll(signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(STATUS_PING_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    })
    if (!res.ok) return null
    return readLastPollPayload(await res.json())
  } catch {
    return null
  }
}

/** One network read per app session (tab navigation must not refetch). */
export function loadLastPoll(): Promise<string | null> {
  if (!sessionPoll) sessionPoll = fetchLastPoll()
  return sessionPoll
}
