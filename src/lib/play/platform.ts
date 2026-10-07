import { stationName, type GameNetwork } from "./network"
import { codesByName, hueOf, interchanges, pickWeighted, QUIZ_LENGTH, type QuizQuestion } from "./quiz"
import { shuffle } from "./rng"

export type PlatformRow = { n: string; t: string; p: string }
export type PlatformTable = Record<string, PlatformRow[]>

export type PlatformFact = {
  key: string
  station: string
  line: string
  towards: string
  platform: string
  /** Stations this platform reaches without a change, in order. */
  ahead: string[]
}

export function platformLabel(value: string): string {
  return value
    .replace(/^platform\s*no\.?\s*/i, "Platform ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Every saved platform whose direction can be traced on the station order. */
export function platformFacts(network: GameNetwork, table: PlatformTable): PlatformFact[] {
  const byName = codesByName(network)
  const facts: PlatformFact[] = []
  for (const [station, rows] of Object.entries(table)) {
    if (!network.names.has(station)) continue
    for (const row of rows) {
      const towards = byName.get(row.t)
      if (!towards) continue
      const ahead = pathTowards(network, station, row.n, towards)
      if (!ahead || ahead.length === 0) continue
      facts.push({
        key: `${station}|${row.n}|${row.t}`,
        station,
        line: row.n,
        towards,
        platform: platformLabel(row.p),
        ahead,
      })
    }
  }
  return facts
}

/** Stations after `from` on the named line towards `to`, following a branch when the line splits. */
export function pathTowards(network: GameNetwork, from: string, lineName: string, to: string): string[] | null {
  const named = network.lines.filter((line) => line.name === lineName)
  for (const line of named) {
    const at = line.codes.indexOf(from)
    const end = line.codes.indexOf(to)
    if (at === -1 || end === -1 || at === end) continue
    return at < end ? line.codes.slice(at + 1, end + 1) : line.codes.slice(end, at).reverse()
  }
  for (const first of named) {
    const at = first.codes.indexOf(from)
    if (at === -1) continue
    for (const second of named) {
      if (second === first) continue
      const end = second.codes.indexOf(to)
      if (end === -1) continue
      const junction = second.codes.find((code) => first.codes.includes(code) && code !== from)
      if (!junction) continue
      const toJunction = pathTowards(network, from, lineName, junction)
      const onward = second.codes.indexOf(junction) < end
        ? second.codes.slice(second.codes.indexOf(junction) + 1, end + 1)
        : second.codes.slice(end, second.codes.indexOf(junction)).reverse()
      if (!toJunction) continue
      return [...toJunction, ...onward]
    }
  }
  return null
}

/** Facts at stations with at least two platforms, which are the ones a round can ask. */
export function askablePlatformFacts(network: GameNetwork, table: PlatformTable): PlatformFact[] {
  const facts = platformFacts(network, table)
  const counts = new Map<string, Set<string>>()
  for (const fact of facts) counts.set(fact.station, (counts.get(fact.station) ?? new Set()).add(fact.platform))
  return facts.filter((fact) => counts.get(fact.station)!.size >= 2)
}

export function platformQuestions(
  network: GameNetwork,
  table: PlatformTable,
  rng: () => number,
  learned: string[] = [],
  review: string[] = [],
  count = QUIZ_LENGTH,
): QuizQuestion[] {
  const facts = platformFacts(network, table)
  const byStation = new Map<string, PlatformFact[]>()
  for (const fact of facts) byStation.set(fact.station, [...(byStation.get(fact.station) ?? []), fact])
  const hubs = interchanges(network)
  const known = new Set(learned)
  const due = new Set(review)
  const askable = new Set(askablePlatformFacts(network, table).map((fact) => fact.key))
  const weighted = facts
    .filter((fact) => askable.has(fact.key))
    .map((fact) => {
      const many = new Set(byStation.get(fact.station)!.map((item) => item.platform)).size >= 3
      let weight = many || hubs.has(fact.station) ? 4 : 1
      if (due.has(fact.key)) weight *= 3
      else if (!known.has(fact.key)) weight *= 2
      return { item: fact, weight }
    })
  const out: QuizQuestion[] = []
  const usedStations = new Set<string>()
  for (const fact of pickWeighted(weighted, weighted.length, rng)) {
    if (out.length >= count) break
    if (usedStations.has(fact.station)) continue
    const here = byStation.get(fact.station)!
    const destination = uniqueDestination(fact, here, rng)
    if (!destination) continue
    usedStations.add(fact.station)
    const platforms = [...new Set(here.map((item) => item.platform))].sort(byNumber)
    const stationLabel = stationName(network, fact.station)
    out.push({
      key: fact.key,
      kicker: stationLabel,
      prompt: `From ${stationLabel} to ${stationName(network, destination)}. Which platform?`,
      choices: platforms.map((platform) => ({ id: platform, label: platform })),
      answer: fact.platform,
      explain: [
        `${fact.platform}: ${fact.line} towards ${stationName(network, fact.towards)}.`,
      ],
      board: here
        .slice()
        .sort((a, b) => byNumber(a.platform, b.platform))
        .map((item) => ({
          platform: item.platform,
          line: item.line,
          hue: hueOf(network, item.line),
          towards: stationName(network, item.towards),
          answer: item.key === fact.key,
        })),
    })
  }
  return out
}

/** A stop that only this platform's trains reach directly from here, so one platform is right. */
function uniqueDestination(fact: PlatformFact, here: PlatformFact[], rng: () => number): string | null {
  const options = shuffle(fact.ahead.slice(0, 10), rng)
  for (const code of options) {
    const platforms = new Set(here.filter((item) => item.ahead.includes(code)).map((item) => item.platform))
    if (platforms.size === 1) return code
  }
  return null
}

function byNumber(a: string, b: string): number {
  const left = Number(a.match(/\d+/)?.[0] ?? Number.NaN)
  const right = Number(b.match(/\d+/)?.[0] ?? Number.NaN)
  if (Number.isFinite(left) && Number.isFinite(right) && left !== right) return left - right
  return a.localeCompare(b)
}
