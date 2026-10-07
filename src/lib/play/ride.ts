import { otherLinesAt, stationName, type GameLine, type GameNetwork, type Point } from "./network"
import { isReview, isStamped, type PlayProgress } from "./progress"
import { pickIndex, shuffle } from "./rng"

export const RIDE_STOPS = 8
export const RIDE_TOKENS = 3
export const STOP_POINTS = 10
export const BONUS_POINTS = 25
export const CLEAN_POINTS = 50
export const QUICK_MS = 5000
export const QUICK_POINTS = 5
export const FARE_POINTS = 30
const MAX_BONUSES = 2

export type FareQuestion = {
  answer: number
  choices: number[]
}

/** Choices are real weekday fares from the same origin pack, closest to the answer. */
export function fareQuestion(answer: number, pool: number[], rng: () => number): FareQuestion | null {
  const others = [...new Set(pool)].filter((fare) => fare !== answer && fare > 0)
  if (others.length < 3) return null
  const near = shuffle(others, rng).sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer)).slice(0, 3)
  return { answer, choices: [answer, ...near].sort((a, b) => a - b) }
}

export type Rank = { title: string; at: number; next: { title: string; at: number } | null }

const RANKS: Array<{ title: string; at: number }> = [
  { title: "First ride", at: 0 },
  { title: "Tourist", at: 10 },
  { title: "Commuter", at: 30 },
  { title: "Regular", at: 70 },
  { title: "Navigator", at: 130 },
  { title: "Line expert", at: 200 },
]

export function rankFor(stamped: number, total: number): Rank {
  const ladder = [...RANKS.filter((rank) => rank.at < total), { title: "Metro master", at: total }]
  let index = 0
  for (let at = 0; at < ladder.length; at += 1) if (stamped >= ladder[at].at) index = at
  const next = ladder[index + 1] ?? null
  return { title: ladder[index].title, at: ladder[index].at, next }
}

export type Ride = {
  lineCode: string
  /** codes[0] is where the ride starts. Every later code is one question. */
  codes: string[]
  towardsCode: string
  /** The stop the train left before codes[0], so the direction of travel is visible. Null at a terminus. */
  behindCode: string | null
}

export type Trap = "skip" | "branch" | "near" | "line" | "any"

export type StopQuestion = {
  answer: string
  choices: string[]
  traps: Record<string, Trap>
}

export type BonusQuestion = {
  station: string
  answer: string
  choices: string[]
}

export function multiplier(combo: number): number {
  return Math.min(4, 1 + Math.floor(combo / 3))
}

export function stopPoints(combo: number): number {
  return STOP_POINTS * multiplier(combo)
}

/** Weight a line by how much of it is still unstamped or due for review. */
export function pickLine(network: GameNetwork, progress: PlayProgress, rng: () => number): GameLine | null {
  if (network.lines.length === 0) return null
  const weights = network.lines.map((line) => {
    let weight = 1
    for (const code of line.codes) {
      if (isReview(progress, line.code, code)) weight += 3
      else if (!isStamped(progress, line.code, code)) weight += 1
    }
    return weight
  })
  const total = weights.reduce((sum, value) => sum + value, 0)
  let roll = rng() * total
  for (let index = 0; index < network.lines.length; index += 1) {
    roll -= weights[index]
    if (roll < 0) return network.lines[index]
  }
  return network.lines[network.lines.length - 1]
}

export function planRide(
  network: GameNetwork,
  progress: PlayProgress,
  rng: () => number,
  lineCode?: string,
  from?: { code: string; towardsCode: string },
): Ride | null {
  const line = lineCode ? network.byCode.get(lineCode) : pickLine(network, progress, rng)
  if (!line) return null
  const last = line.codes.length - 1
  if (from) {
    const at = line.codes.indexOf(from.code)
    if (at !== -1) {
      let dir = from.towardsCode === line.codes[0] ? -1 : 1
      if (at + dir < 0 || at + dir > last) dir = -dir
      return stretch(line, at, dir)
    }
  }
  const candidates: Array<{ at: number; dir: number; weight: number }> = []
  for (let at = 0; at <= last; at += 1) {
    for (const dir of [1, -1]) {
      const room = dir === 1 ? last - at : at
      if (room < Math.min(3, last)) continue
      let weight = 1
      for (let step = 1; step <= Math.min(RIDE_STOPS, room); step += 1) {
        const code = line.codes[at + step * dir]
        if (isReview(progress, line.code, code)) weight += 3
        else if (!isStamped(progress, line.code, code)) weight += 2
      }
      candidates.push({ at, dir, weight })
    }
  }
  if (candidates.length === 0) return null
  const top = Math.max(...candidates.map((item) => item.weight))
  const strong = candidates.filter((item) => item.weight >= top * 0.75)
  const chosen = strong[pickIndex(rng, strong.length)]
  return stretch(line, chosen.at, chosen.dir)
}

function stretch(line: GameLine, at: number, dir: number): Ride {
  const last = line.codes.length - 1
  const room = dir === 1 ? last - at : at
  const codes: string[] = []
  for (let step = 0; step <= Math.min(RIDE_STOPS, room); step += 1) codes.push(line.codes[at + step * dir])
  return {
    lineCode: line.code,
    codes,
    towardsCode: dir === 1 ? line.codes[last] : line.codes[0],
    behindCode: line.codes[at - dir] ?? null,
  }
}

export function stopQuestion(network: GameNetwork, ride: Ride, step: number, rng: () => number): StopQuestion {
  const line = network.byCode.get(ride.lineCode)
  const answer = ride.codes[step]
  const current = ride.codes[step - 1]
  const traps: Record<string, Trap> = { [answer]: "line" }
  if (!line || !answer || !current) return { answer, choices: [answer], traps }
  const dir = line.codes.indexOf(answer) - line.codes.indexOf(current)
  const visited = new Set(ride.codes.slice(0, step))
  const behind = line.codes[line.codes.indexOf(current) - dir]
  if (behind) visited.add(behind)
  if (ride.behindCode) visited.add(ride.behindCode)
  const usedNames = new Set([stationName(network, answer)])
  const picked: string[] = []
  const take = (code: string | undefined, trap: Trap) => {
    if (!code || picked.length >= 3 || code === answer || visited.has(code) || code in traps) return false
    const name = stationName(network, code)
    if (usedNames.has(name)) return false
    usedNames.add(name)
    traps[code] = trap
    picked.push(code)
    return true
  }
  take(line.codes[line.codes.indexOf(answer) + dir], "skip")
  const branches = shuffle(
    otherLinesAt(network, current, line.code).flatMap((other) => {
      const at = other.codes.indexOf(current)
      return [other.codes[at - 1], other.codes[at + 1]].filter((code): code is string => Boolean(code))
    }),
    rng,
  )
  for (const code of branches) if (take(code, "branch")) break
  const near = nearest(network, answer, new Set(line.codes), 4)
  for (const code of shuffle(near, rng)) if (take(code, "near")) break
  for (const code of shuffle(line.codes, rng)) take(code, "line")
  for (const code of shuffle([...network.names.keys()], rng)) take(code, "any")
  return { answer, choices: shuffle([answer, ...picked], rng), traps }
}

function nearest(network: GameNetwork, code: string, skip: Set<string>, count: number): string[] {
  const origin = network.coords.get(code)
  if (!origin) return []
  return [...network.coords.entries()]
    .filter(([other]) => other !== code && !skip.has(other))
    .map(([other, point]) => ({ other, distance: squared(origin, point) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((item) => item.other)
}

function squared(a: Point, b: Point): number {
  const lat = a.lat - b.lat
  const lng = (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)
  return lat * lat + lng * lng
}

export function bonusQuestion(network: GameNetwork, station: string, lineCode: string, rng: () => number): BonusQuestion | null {
  const others = otherLinesAt(network, station, lineCode)
  if (others.length === 0) return null
  const answer = others[pickIndex(rng, others.length)]
  const ride = network.byCode.get(lineCode)
  const atStation = new Set([...(network.linesAt.get(station) ?? [])].map((code) => network.byCode.get(code)?.name))
  const names = new Set([answer.name])
  const distractors: string[] = []
  for (const line of shuffle(network.lines, rng)) {
    if (distractors.length === 3) break
    if (atStation.has(line.name) || names.has(line.name) || line.name === ride?.name) continue
    names.add(line.name)
    distractors.push(line.code)
  }
  if (distractors.length < 3) return null
  return { station, answer: answer.code, choices: shuffle([answer.code, ...distractors], rng) }
}

/** Offer a bonus at an interchange about two times in three, at most twice a ride. */
export function wantsBonus(asked: number, rng: () => number): boolean {
  return asked < MAX_BONUSES && rng() < 0.67
}

export function interchangesOn(network: GameNetwork, ride: Ride): Array<{ code: string; lines: GameLine[] }> {
  return ride.codes
    .map((code) => ({ code, lines: otherLinesAt(network, code, ride.lineCode) }))
    .filter((item) => item.lines.length > 0)
}
