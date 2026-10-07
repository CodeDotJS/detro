import type { GameNetwork } from "./network"
import { pickIndex } from "./rng"

export type ModeId = "change" | "platform" | "compare"

export const QUIZ_LENGTH = 8

export type QuizChoice = { id: string; label: string; hue?: string }

export type QuizLeg = {
  line: string
  hue: string
  towards: string | null
  platform: string | null
  from: string
  to: string
  stops: number | null
}

export type QuizBoardRow = { platform: string; line: string; hue: string; towards: string; answer: boolean }

export type QuizQuestion = {
  /** Progress key for what this question teaches. */
  key: string
  kicker: string
  prompt: string
  choices: QuizChoice[]
  answer: string
  explain: string[]
  legs?: QuizLeg[]
  board?: QuizBoardRow[]
}

const NEUTRAL = "#5c6570"

export function hueOf(network: GameNetwork, lineName: string): string {
  return network.lines.find((line) => line.name === lineName)?.color ?? NEUTRAL
}

export function codesByName(network: GameNetwork): Map<string, string> {
  const out = new Map<string, string>()
  for (const [code, name] of network.names) if (!out.has(name)) out.set(name, code)
  return out
}

/** Stations served by more than one differently named line. */
export function interchanges(network: GameNetwork): Set<string> {
  const out = new Set<string>()
  for (const [code, through] of network.linesAt) {
    const names = new Set(through.map((lineCode) => network.byCode.get(lineCode)?.name))
    if (names.size > 1) out.add(code)
  }
  return out
}

/** Weighted picks without repeats. */
export function pickWeighted<T>(items: Array<{ item: T; weight: number }>, count: number, rng: () => number): T[] {
  const pool = items.filter((entry) => entry.weight > 0)
  const out: T[] = []
  while (out.length < count && pool.length > 0) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0)
    let roll = rng() * total
    let index = 0
    for (; index < pool.length - 1; index += 1) {
      roll -= pool[index].weight
      if (roll < 0) break
    }
    out.push(pool[index].item)
    pool.splice(index, 1)
  }
  return out
}

export function pickOne<T>(items: T[], rng: () => number): T | undefined {
  return items.length > 0 ? items[pickIndex(rng, items.length)] : undefined
}
