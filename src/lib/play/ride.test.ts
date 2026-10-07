import { describe, expect, it } from "vitest"
import coordinatesFile from "../../../data/en/coordinates.json"
import { loadSnapshot } from "../dmrc/snapshot"
import type { LineSequence } from "../transit/route"
import { buildGameNetwork } from "./network"
import { emptyPlayProgress, recordStop } from "./progress"
import {
  bonusQuestion,
  fareQuestion,
  interchangesOn,
  multiplier,
  planRide,
  rankFor,
  RIDE_STOPS,
  stopPoints,
  stopQuestion,
} from "./ride"
import { mulberry32 } from "./rng"

function line(code: string, colorName: string, stations: string[], color = "#000000"): LineSequence {
  return {
    code,
    show: true,
    label: {
      en: { name: code, colorName, color },
      hi: { name: code, colorName, color },
    },
    stations: stations.map((item) => ({ code: item, names: { en: item } })),
  }
}

const fixture: LineSequence[] = [
  line("L1", "Red Line", ["A1", "A2", "A3", "X", "A5", "A6", "A7", "A8", "A9", "A10", "A11"]),
  line("L2", "Yellow Line", ["B1", "B2", "X", "B4", "B5"]),
  line("L3", "Blue Line", ["C1", "C2", "C3", "C4"]),
  line("L4", "Green Line", ["D1", "D2", "D3"]),
  line("L5", "Pink Line", ["E1", "E2", "E3"]),
]

describe("next stop ride", () => {
  const network = buildGameNetwork(fixture)

  it("plans a stretch of consecutive stops on one line", () => {
    const ride = planRide(network, emptyPlayProgress(), mulberry32(4), "L1")
    expect(ride).not.toBeNull()
    if (!ride) return
    const codes = network.byCode.get("L1")!.codes
    expect(ride.codes.length).toBeGreaterThanOrEqual(4)
    expect(ride.codes.length).toBeLessThanOrEqual(RIDE_STOPS + 1)
    const positions = ride.codes.map((code) => codes.indexOf(code))
    const step = positions[1] - positions[0]
    expect(Math.abs(step)).toBe(1)
    positions.forEach((at, index) => expect(at).toBe(positions[0] + index * step))
    expect(ride.towardsCode).toBe(step === 1 ? "A11" : "A1")
    expect(ride.behindCode).toBe(codes[positions[0] - step] ?? null)
  })

  it("never offers the stop behind the train", () => {
    const ride = { lineCode: "L1", codes: ["A5", "A6", "A7", "A8"], towardsCode: "A11", behindCode: "X" }
    for (let seed = 1; seed < 60; seed += 1) {
      expect(stopQuestion(network, ride, 1, mulberry32(seed)).choices).not.toContain("X")
      expect(stopQuestion(network, ride, 2, mulberry32(seed)).choices).not.toContain("A5")
    }
  })

  it("rides on from the last stop in the same direction, and turns at the end", () => {
    const on = planRide(network, emptyPlayProgress(), mulberry32(1), "L1", { code: "A3", towardsCode: "A11" })
    expect(on?.codes.slice(0, 2)).toEqual(["A3", "X"])
    const turned = planRide(network, emptyPlayProgress(), mulberry32(1), "L1", { code: "A11", towardsCode: "A11" })
    expect(turned?.codes.slice(0, 2)).toEqual(["A11", "A10"])
    expect(turned?.towardsCode).toBe("A1")
  })

  it("prefers stops due for review", () => {
    let progress = emptyPlayProgress()
    for (const code of ["A1", "A2", "A3", "X", "A5", "A6"]) progress = recordStop(progress, "L1", code, true)
    progress = recordStop(progress, "L1", "A10", false)
    for (let seed = 1; seed < 20; seed += 1) {
      const ride = planRide(network, progress, mulberry32(seed), "L1")
      expect(ride?.codes.slice(1)).toContain("A10")
    }
  })

  it("asks the next stop with four real stations and a wrong-line trap at an interchange", () => {
    const ride = { lineCode: "L1", codes: ["A3", "X", "A5", "A6"], towardsCode: "A11", behindCode: "A2" }
    const question = stopQuestion(network, ride, 2, mulberry32(9))
    expect(question.answer).toBe("A5")
    expect(question.choices).toHaveLength(4)
    expect(new Set(question.choices).size).toBe(4)
    expect(question.choices).not.toContain("X")
    expect(question.choices).not.toContain("A3")
    expect(question.choices).toContain("A6")
    expect(question.traps.A6).toBe("skip")
    expect(question.choices.some((code) => question.traps[code] === "branch")).toBe(true)
    expect(question.choices.every((code) => network.names.has(code))).toBe(true)
  })

  it("asks which other line stops at an interchange", () => {
    const bonus = bonusQuestion(network, "X", "L1", mulberry32(2))
    expect(bonus?.answer).toBe("L2")
    expect(bonus?.choices).toHaveLength(4)
    expect(bonus?.choices).not.toContain("L1")
    expect(bonusQuestion(network, "A5", "L1", mulberry32(2))).toBeNull()
  })

  it("lists interchanges on a ride", () => {
    const ride = { lineCode: "L1", codes: ["A3", "X", "A5"], towardsCode: "A11", behindCode: "A2" }
    expect(interchangesOn(network, ride).map((item) => item.code)).toEqual(["X"])
  })

  it("scores Express from the third stop in a row", () => {
    expect([1, 2, 3, 5, 6, 9, 30].map(multiplier)).toEqual([1, 1, 2, 2, 3, 4, 4])
    expect(stopPoints(3)).toBe(20)
  })

  it("offers the real fare among the nearest saved fares", () => {
    const question = fareQuestion(32, [11, 21, 32, 43, 54, 64], mulberry32(3))
    expect(question?.choices).toEqual([11, 21, 32, 43])
    expect(question?.answer).toBe(32)
    expect(fareQuestion(32, [21, 32, 43], mulberry32(3))).toBeNull()
  })

  it("names a rank and the stations to the next one", () => {
    expect(rankFor(0, 254)).toMatchObject({ title: "First ride", next: { title: "Tourist", at: 10 } })
    expect(rankFor(35, 254).title).toBe("Commuter")
    expect(rankFor(254, 254)).toMatchObject({ title: "Metro master", next: null })
  })

  it("plays every line in the saved network with real stations", () => {
    const snapshot = loadSnapshot()
    const coords = (coordinatesFile as { stations: Record<string, { lat: number; lng: number }> }).stations
    const saved = buildGameNetwork(snapshot.lines, coords)
    expect(saved.lines.length).toBeGreaterThan(10)
    expect(saved.lines.some((item) => item.code === "LN12")).toBe(false)
    for (const item of saved.lines) {
      const ride = planRide(saved, emptyPlayProgress(), mulberry32(21), item.code)
      expect(ride).not.toBeNull()
      if (!ride) continue
      for (let step = 1; step < ride.codes.length; step += 1) {
        const question = stopQuestion(saved, ride, step, mulberry32(step))
        expect(question.choices).toContain(ride.codes[step])
        expect(question.choices).not.toContain(step === 1 ? ride.behindCode : ride.codes[step - 2])
        expect(new Set(question.choices.map((code) => saved.names.get(code))).size).toBe(question.choices.length)
        expect(question.choices.length).toBe(4)
        expect(question.choices.every((code) => saved.names.has(code))).toBe(true)
      }
    }
  })
})
