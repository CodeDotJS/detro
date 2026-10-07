import type { PackFile } from "../offline/saved"
import { stationName, type GameNetwork } from "./network"
import { QUIZ_LENGTH, type QuizQuestion } from "./quiz"
import { pickIndex, shuffle } from "./rng"

type Option = { code: string; minutes: number | null; fare: number | null }

/** The gap between the two trips narrows as the round goes on. */
export function minuteGap(index: number): number {
  return index < 3 ? 15 : index < 6 ? 7 : 3
}

export function compareQuestions(
  network: GameNetwork,
  origin: string,
  pack: PackFile,
  rng: () => number,
  count = QUIZ_LENGTH,
): QuizQuestion[] {
  const options: Option[] = Object.entries(pack)
    .filter(([code]) => network.names.has(code) && code !== origin)
    .map(([code, row]) => ({
      code,
      minutes: typeof row.d?.m === "number" && row.d.m > 0 ? row.d.m : null,
      fare: typeof row.d?.w === "number" && row.d.w > 0 ? row.d.w : null,
    }))
  const used = new Set<string>()
  const from = stationName(network, origin)
  const out: QuizQuestion[] = []
  for (let index = 0; index < count; index += 1) {
    const kind = index % 3 === 2 ? "fare" : "time"
    const pair = pickPair(options, used, rng, kind, minuteGap(index)) ?? pickPair(options, used, rng, "time", 3)
    if (!pair) break
    const [a, b] = pair
    used.add(a.code)
    used.add(b.code)
    const isFare = pair.kind === "fare"
    const value = (item: Option) => (isFare ? item.fare! : item.minutes!)
    const answer = value(a) > value(b) ? a : b
    const show = (item: Option) =>
      isFare ? `${stationName(network, item.code)}: ₹${item.fare} on a weekday.` : `${stationName(network, item.code)}: about ${item.minutes} minutes.`
    out.push({
      key: `${origin}|${a.code}|${b.code}`,
      kicker: `From ${from}`,
      prompt: isFare ? "Which trip costs more on a weekday?" : "Which trip takes longer?",
      choices: [a, b].map((item) => ({ id: item.code, label: `${from} → ${stationName(network, item.code)}` })),
      answer: answer.code,
      explain: [answer, answer === a ? b : a].map(show),
    })
  }
  return out
}

function pickPair(
  options: Option[],
  used: Set<string>,
  rng: () => number,
  kind: "time" | "fare",
  gap: number,
): (([Option, Option]) & { kind: "time" | "fare" }) | null {
  const pool = shuffle(
    options.filter((item) => !used.has(item.code) && (kind === "fare" ? item.fare !== null : item.minutes !== null)),
    rng,
  )
  for (let tries = 0; tries < 200 && pool.length >= 2; tries += 1) {
    const a = pool[pickIndex(rng, pool.length)]
    const b = pool[pickIndex(rng, pool.length)]
    if (a === b) continue
    const left = kind === "fare" ? a.fare! : a.minutes!
    const right = kind === "fare" ? b.fare! : b.minutes!
    const diff = Math.abs(left - right)
    if (kind === "fare" ? diff === 0 : diff < gap || diff > gap * 3) continue
    return Object.assign([a, b] as [Option, Option], { kind })
  }
  return null
}
