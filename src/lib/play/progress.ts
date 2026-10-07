import type { KeyValueStore } from "../plan/trips"
import type { GameLine } from "./network"
import type { ModeId } from "./quiz"

export const playStorageKey = "dms-play"
const VERSION = 3
const MODES: ModeId[] = ["change", "platform", "compare"]

export type ModeStats = { best: number; rounds: number }

export type PlayProgress = {
  best: number
  rides: number
  stamps: Record<string, string[]>
  review: Record<string, string[]>
  modes: Partial<Record<ModeId, ModeStats>>
  /** Keys learned per mode, and keys missed per mode under `review`. */
  learned: Partial<Record<ModeId, string[]>>
  missed: Partial<Record<ModeId, string[]>>
}

export function emptyPlayProgress(): PlayProgress {
  return { best: 0, rides: 0, stamps: {}, review: {}, modes: {}, learned: {}, missed: {} }
}

export function readPlayProgress(store: KeyValueStore): PlayProgress {
  try {
    const raw = store.getItem(playStorageKey)
    if (!raw) return emptyPlayProgress()
    const parsed = JSON.parse(raw) as Partial<PlayProgress> & { v?: unknown }
    if (parsed.v !== VERSION && parsed.v !== 2) return emptyPlayProgress()
    return {
      best: whole(parsed.best),
      rides: whole(parsed.rides),
      stamps: codeSets(parsed.stamps),
      review: codeSets(parsed.review),
      modes: modeStats(parsed.modes),
      learned: codeSets(parsed.learned) as PlayProgress["learned"],
      missed: codeSets(parsed.missed) as PlayProgress["missed"],
    }
  } catch {
    return emptyPlayProgress()
  }
}

/** A right answer marks the key learned and clears it from review. A miss queues it for review. */
export function recordAnswer(progress: PlayProgress, mode: ModeId, key: string, ok: boolean): PlayProgress {
  const learned = progress.learned[mode] ?? []
  const missed = progress.missed[mode] ?? []
  if (ok) {
    return {
      ...progress,
      learned: withCodes(progress.learned, mode, learned.includes(key) ? learned : [...learned, key]),
      missed: withCodes(progress.missed, mode, missed.filter((item) => item !== key)),
    }
  }
  return { ...progress, missed: withCodes(progress.missed, mode, missed.includes(key) ? missed : [...missed, key]) }
}

export function finishRound(progress: PlayProgress, mode: ModeId, points: number): PlayProgress {
  const stats = progress.modes[mode] ?? { best: 0, rounds: 0 }
  return {
    ...progress,
    modes: { ...progress.modes, [mode]: { best: Math.max(stats.best, whole(points)), rounds: stats.rounds + 1 } },
  }
}

function modeStats(value: unknown): PlayProgress["modes"] {
  if (!value || typeof value !== "object") return {}
  const out: PlayProgress["modes"] = {}
  for (const mode of MODES) {
    const stats = (value as Record<string, unknown>)[mode]
    if (!stats || typeof stats !== "object") continue
    const { best, rounds } = stats as Record<string, unknown>
    out[mode] = { best: whole(best), rounds: whole(rounds) }
  }
  return out
}

export function writePlayProgress(store: KeyValueStore, progress: PlayProgress): void {
  store.setItem(playStorageKey, JSON.stringify({ v: VERSION, ...progress }))
}

export function clearPlayProgress(store: KeyValueStore): void {
  store.removeItem(playStorageKey)
}

export function isStamped(progress: PlayProgress, lineCode: string, code: string): boolean {
  return progress.stamps[lineCode]?.includes(code) ?? false
}

export function isReview(progress: PlayProgress, lineCode: string, code: string): boolean {
  return progress.review[lineCode]?.includes(code) ?? false
}

/** A right answer stamps the station on that line and clears it from review. A miss queues it for review. */
export function recordStop(progress: PlayProgress, lineCode: string, code: string, ok: boolean): PlayProgress {
  const stamps = progress.stamps[lineCode] ?? []
  const review = progress.review[lineCode] ?? []
  if (ok) {
    return {
      ...progress,
      stamps: withCodes(progress.stamps, lineCode, stamps.includes(code) ? stamps : [...stamps, code]),
      review: withCodes(progress.review, lineCode, review.filter((item) => item !== code)),
    }
  }
  return {
    ...progress,
    review: withCodes(progress.review, lineCode, review.includes(code) ? review : [...review, code]),
  }
}

function withCodes<T extends Partial<Record<string, string[]>>>(sets: T, key: string, codes: string[]): T {
  const next: Partial<Record<string, string[]>> = { ...sets }
  if (codes.length > 0) next[key] = codes
  else delete next[key]
  return next as T
}

export function finishRide(progress: PlayProgress, points: number): PlayProgress {
  return { ...progress, rides: progress.rides + 1, best: Math.max(progress.best, whole(points)) }
}

export function stampedOn(progress: PlayProgress, line: GameLine): number {
  const stamps = new Set(progress.stamps[line.code] ?? [])
  return line.codes.filter((code) => stamps.has(code)).length
}

export function stampedTotal(progress: PlayProgress, lines: GameLine[]): number {
  const seen = new Set<string>()
  for (const line of lines) {
    const stamps = new Set(progress.stamps[line.code] ?? [])
    for (const code of line.codes) if (stamps.has(code)) seen.add(code)
  }
  return seen.size
}

function codeSets(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const out: Record<string, string[]> = {}
  for (const [key, list] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue
    const codes = [...new Set(list.filter((item): item is string => typeof item === "string" && item.length > 0))]
    if (codes.length > 0) out[key] = codes
  }
  return out
}

function whole(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0
  return Math.round(value)
}
