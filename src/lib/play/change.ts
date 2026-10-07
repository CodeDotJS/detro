import type { PackFile } from "../offline/saved"
import type { PackLeg, PackRide } from "../offline/pack"
import { stationName, type GameNetwork } from "./network"
import { pathTowards, platformLabel } from "./platform"
import { codesByName, hueOf, interchanges, pickWeighted, QUIZ_LENGTH, type QuizLeg, type QuizQuestion } from "./quiz"
import { shuffle } from "./rng"

type Trip = { destination: string; legs: Array<PackLeg & { c: string[] }>; ride: PackRide }

/** Trips with a change where the shortest and the fewest-changes routes change at the same stations. */
export function changeTrips(pack: PackFile): Trip[] {
  const out: Trip[] = []
  for (const [destination, row] of Object.entries(pack)) {
    const ride = row.d
    const legs = withCodes(ride?.g)
    if (!ride || !legs || legs.length < 2) continue
    if (row.c) {
      const other = withCodes(row.c.g)
      if (!other || changesOf(other).join(">") !== changesOf(legs).join(">")) continue
    }
    out.push({ destination, legs, ride })
  }
  return out
}

export function changeQuestions(
  network: GameNetwork,
  origin: string,
  pack: PackFile,
  rng: () => number,
  learned: string[] = [],
  count = QUIZ_LENGTH,
): QuizQuestion[] {
  const known = new Set(learned)
  const hubs = interchanges(network)
  const trips = changeTrips(pack).filter(
    (trip) => network.names.has(trip.destination) && trip.legs.every((leg) => leg.c.every((code) => network.names.has(code))),
  )
  const weighted = trips.map((trip) => {
    const answer = changesOf(trip.legs)[0]
    let weight = trip.legs.length === 2 ? 3 : trip.legs.length === 3 ? 2 : 1
    if (!known.has(answer)) weight *= 2
    return { item: trip, weight }
  })
  const answers = new Map<string, number>()
  const picked: Trip[] = []
  for (const trip of pickWeighted(weighted, weighted.length, rng)) {
    if (picked.length >= count) break
    const answer = changesOf(trip.legs)[0]
    if ((answers.get(answer) ?? 0) >= 2) continue
    answers.set(answer, (answers.get(answer) ?? 0) + 1)
    picked.push(trip)
  }
  picked.sort((a, b) => a.legs.length - b.legs.length)
  return picked
    .map((trip) => question(network, origin, trip, hubs, rng))
    .filter((item): item is QuizQuestion => item !== null)
}

function question(network: GameNetwork, origin: string, trip: Trip, hubs: Set<string>, rng: () => number): QuizQuestion | null {
  const [first, second] = trip.legs
  const answer = first.c[first.c.length - 1]
  const onRoute = new Set(trip.legs.flatMap((leg) => leg.c))
  const towards = first.t ? codesByName(network).get(first.t) : undefined
  const ahead = (towards && pathTowards(network, origin, first.n, towards)) || first.c.slice(1)
  const stops = ahead.filter((code) => hubs.has(code) && code !== answer && code !== trip.destination)
  const at = ahead.indexOf(answer)
  const before = stops.filter((code) => ahead.indexOf(code) < at).reverse()
  const after = stops.filter((code) => ahead.indexOf(code) > at)
  const names = new Set([stationName(network, answer)])
  const laterLines = new Set(trip.legs.slice(1).map((leg) => leg.n))
  const alsoWorks = (code: string) =>
    (network.linesAt.get(code) ?? []).some((lineCode) => laterLines.has(network.byCode.get(lineCode)?.name ?? ""))
  const traps: string[] = []
  const take = (code: string | undefined) => {
    if (!code || traps.length >= 3 || code === origin || code === answer || code === trip.destination) return
    if (alsoWorks(code)) return
    const name = stationName(network, code)
    if (names.has(name)) return
    names.add(name)
    traps.push(code)
  }
  take(before[0])
  take(after[0])
  for (const code of nearestHubs(network, answer, hubs, onRoute)) take(code)
  for (const code of shuffle([...hubs], rng)) take(code)
  if (traps.length < 3) return null
  const from = stationName(network, origin)
  const to = stationName(network, trip.destination)
  const later = trip.legs.length > 2 ? "first " : ""
  const explain = [`Change at ${stationName(network, answer)} for the ${second.n}${second.t ? ` towards ${second.t}` : ""}.`]
  const trail: string[] = []
  if (typeof trip.ride.m === "number") trail.push(`about ${trip.ride.m} minutes`)
  if (typeof trip.ride.w === "number") trail.push(`₹${trip.ride.w} on a weekday`)
  if (trail.length > 0) explain.push(`The whole trip is ${trail.join(", ")}.`)
  return {
    key: answer,
    kicker: `${from} → ${to}`,
    prompt: `From ${from} to ${to}. You board the ${first.n}${first.t ? ` towards ${first.t}` : ""}. Where is your ${later}change?`,
    choices: shuffle([answer, ...traps], rng).map((code) => ({ id: code, label: stationName(network, code) })),
    answer,
    explain,
    legs: trip.legs.map((leg) => legOf(network, leg)),
  }
}

function legOf(network: GameNetwork, leg: PackLeg & { c: string[] }): QuizLeg {
  return {
    line: leg.n,
    hue: hueOf(network, leg.n),
    towards: leg.t ?? null,
    platform: leg.p ? platformLabel(leg.p) : null,
    from: stationName(network, leg.c[0]),
    to: stationName(network, leg.c[leg.c.length - 1]),
    stops: leg.c.length - 1,
  }
}

function nearestHubs(network: GameNetwork, code: string, hubs: Set<string>, skip: Set<string>): string[] {
  const origin = network.coords.get(code)
  if (!origin) return []
  return [...hubs]
    .filter((other) => !skip.has(other) && network.coords.has(other))
    .map((other) => {
      const point = network.coords.get(other)!
      const lat = origin.lat - point.lat
      const lng = (origin.lng - point.lng) * Math.cos((origin.lat * Math.PI) / 180)
      return { other, distance: lat * lat + lng * lng }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((item) => item.other)
}

function withCodes(legs: PackLeg[] | undefined): Array<PackLeg & { c: string[] }> | null {
  if (!legs || legs.length === 0) return null
  if (!legs.every((leg) => Array.isArray(leg.c) && leg.c.length >= 2)) return null
  return legs as Array<PackLeg & { c: string[] }>
}

function changesOf(legs: Array<PackLeg & { c: string[] }>): string[] {
  return legs.slice(0, -1).map((leg) => leg.c[leg.c.length - 1])
}
