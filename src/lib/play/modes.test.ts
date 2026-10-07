import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import coordinatesFile from "../../../data/en/coordinates.json"
import platformsFile from "../../../data/en/platforms.json"
import { loadSnapshot } from "../dmrc/snapshot"
import type { PackFile } from "../offline/saved"
import { changeQuestions, changeTrips } from "./change"
import { compareQuestions, minuteGap } from "./compare"
import { buildGameNetwork } from "./network"
import { pathTowards, platformFacts, platformLabel, platformQuestions, type PlatformTable } from "./platform"
import { emptyPlayProgress, finishRound, recordAnswer } from "./progress"
import { interchanges, QUIZ_LENGTH } from "./quiz"
import { mulberry32 } from "./rng"

const snapshot = loadSnapshot()
const coords = (coordinatesFile as { stations: Record<string, { lat: number; lng: number }> }).stations
const network = buildGameNetwork(snapshot.lines, coords)
const table = (platformsFile as { stations: PlatformTable }).stations

function pack(origin: string): PackFile {
  return JSON.parse(fs.readFileSync(path.resolve("data/en/journeys", `${origin}.json`), "utf8")) as PackFile
}

describe("platform game", () => {
  it("cleans platform labels without changing the number", () => {
    expect(platformLabel("Platform No. 4")).toBe("Platform 4")
    expect(platformLabel("Platform No.1")).toBe("Platform 1")
    expect(platformLabel("Platform No. 4 (Pink Line)")).toBe("Platform 4 (Pink Line)")
  })

  it("follows a branch to the end of the line", () => {
    const ahead = pathTowards(network, "RCK", "Blue Line", "VASI")
    expect(ahead?.[0]).toBe("BRKR")
    expect(ahead?.at(-1)).toBe("VASI")
    expect(ahead).toContain("YB")
  })

  it("asks real platforms with exactly one right answer", () => {
    const facts = platformFacts(network, table)
    expect(facts.length).toBeGreaterThan(400)
    for (let seed = 1; seed <= 10; seed += 1) {
      const round = platformQuestions(network, table, mulberry32(seed))
      expect(round).toHaveLength(QUIZ_LENGTH)
      expect(new Set(round.map((item) => item.kicker)).size).toBe(QUIZ_LENGTH)
      for (const question of round) {
        const station = question.key.split("|")[0]
        const saved = table[station].map((row) => platformLabel(row.p))
        expect(question.choices.length).toBeGreaterThanOrEqual(2)
        expect(question.choices.every((choice) => saved.includes(choice.id))).toBe(true)
        expect(question.choices.map((choice) => choice.id)).toContain(question.answer)
        const trip = /^From (.+) to (.+)\. Which platform\?$/.exec(question.prompt)
        const origin = [...network.names].find(([, name]) => name === trip?.[1])?.[0]
        const destination = [...network.names].find(([, name]) => name === trip?.[2])?.[0]
        expect(origin).toBe(station)
        expect(destination).toBeDefined()
        const serving = new Set(
          facts.filter((fact) => fact.station === station && fact.ahead.includes(destination!)).map((fact) => fact.platform),
        )
        expect([...serving]).toEqual([question.answer])
      }
    }
  })
})

describe("change game", () => {
  it("skips trips where the two saved routes change at different stations", () => {
    const rows = pack("RCK")
    const trips = changeTrips(rows)
    expect(trips.length).toBeGreaterThan(50)
    for (const trip of trips) {
      const other = rows[trip.destination].c
      if (!other?.g) continue
      const changes = (legs: typeof trip.legs) => legs.slice(0, -1).map((leg) => leg.c.at(-1))
      expect(changes(other.g as typeof trip.legs)).toEqual(changes(trip.legs))
    }
  })

  it("asks where to change with real interchanges and the saved answer", () => {
    const hubs = interchanges(network)
    for (const origin of ["RCK", "KG", "DSTO", "AHNR", "NECC"]) {
      const rows = pack(origin)
      const round = changeQuestions(network, origin, rows, mulberry32(7))
      expect(round.length).toBeGreaterThanOrEqual(6)
      for (const question of round) {
        const destination = [...network.names].find(([, name]) => question.kicker.endsWith(`→ ${name}`))?.[0]
        const legs = rows[destination!].d!.g!
        expect(question.prompt.startsWith(`From ${network.names.get(origin)} to ${network.names.get(destination!)}.`)).toBe(true)
        expect(question.answer).toBe(legs[0].c!.at(-1))
        expect(question.choices).toHaveLength(4)
        expect(new Set(question.choices.map((choice) => choice.label)).size).toBe(4)
        for (const choice of question.choices) {
          if (choice.id === question.answer) continue
          expect(hubs.has(choice.id)).toBe(true)
          const later = new Set(legs.slice(1).map((leg) => leg.n))
          const served = (network.linesAt.get(choice.id) ?? []).map((code) => network.byCode.get(code)!.name)
          expect(served.some((name) => later.has(name))).toBe(false)
        }
        expect(question.legs?.length).toBe(legs.length)
      }
    }
  })
})

describe("faster or cheaper game", () => {
  it("compares two saved trips with a clear winner, narrowing the gap", () => {
    const rows = pack("KG")
    const round = compareQuestions(network, "KG", rows, mulberry32(5))
    expect(round).toHaveLength(QUIZ_LENGTH)
    round.forEach((question, index) => {
      const [a, b] = question.choices.map((choice) => rows[choice.id].d!)
      const fare = question.prompt.includes("costs")
      const left = fare ? a.w! : a.m!
      const right = fare ? b.w! : b.m!
      expect(left).not.toBe(right)
      expect(question.choices.every((choice) => choice.label.startsWith(`${network.names.get("KG")} → `))).toBe(true)
      expect(question.answer).toBe(question.choices[left > right ? 0 : 1].id)
      if (!fare) expect(Math.abs(left - right)).toBeGreaterThanOrEqual(minuteGap(index))
    })
    expect(round.some((question) => question.prompt.includes("costs"))).toBe(true)
  })
})

describe("mode progress", () => {
  it("learns keys, queues misses, and keeps a best per mode", () => {
    let progress = recordAnswer(emptyPlayProgress(), "platform", "RCK|Blue Line|DWARKA SECTOR - 21", false)
    expect(progress.missed.platform).toHaveLength(1)
    progress = recordAnswer(progress, "platform", "RCK|Blue Line|DWARKA SECTOR - 21", true)
    expect(progress.learned.platform).toHaveLength(1)
    expect(progress.missed.platform).toBeUndefined()
    progress = finishRound(finishRound(progress, "change", 90), "change", 40)
    expect(progress.modes.change).toEqual({ best: 90, rounds: 2 })
  })
})
