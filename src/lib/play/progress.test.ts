import { describe, expect, it } from "vitest"
import {
  clearPlayProgress,
  emptyPlayProgress,
  finishRide,
  isReview,
  isStamped,
  playStorageKey,
  readPlayProgress,
  recordStop,
  stampedOn,
  stampedTotal,
  writePlayProgress,
} from "./progress"

function memory(start: Record<string, string> = {}) {
  const data = { ...start }
  return {
    getItem(key: string) {
      return data[key] ?? null
    },
    setItem(key: string, value: string) {
      data[key] = value
    },
    removeItem(key: string) {
      delete data[key]
    },
    data,
  }
}

const red = { code: "L1", name: "Red Line", color: "#c0282c", codes: ["A", "X", "B"] }
const yellow = { code: "L2", name: "Yellow Line", color: "#f6d71a", codes: ["C", "X", "D"] }

describe("play progress", () => {
  it("starts empty and survives a round trip", () => {
    const store = memory()
    expect(readPlayProgress(store)).toEqual(emptyPlayProgress())
    const progress = finishRide(recordStop(emptyPlayProgress(), "L1", "A", true), 120)
    writePlayProgress(store, progress)
    expect(store.data[playStorageKey]).toBeTruthy()
    expect(readPlayProgress(store)).toEqual(progress)
    clearPlayProgress(store)
    expect(readPlayProgress(store)).toEqual(emptyPlayProgress())
  })

  it("stamps a right stop and queues a miss for review", () => {
    let progress = recordStop(emptyPlayProgress(), "L1", "B", false)
    expect(isReview(progress, "L1", "B")).toBe(true)
    expect(isStamped(progress, "L1", "B")).toBe(false)
    progress = recordStop(progress, "L1", "B", true)
    expect(isReview(progress, "L1", "B")).toBe(false)
    expect(isStamped(progress, "L1", "B")).toBe(true)
    expect(recordStop(progress, "L1", "B", true).stamps.L1).toEqual(["B"])
  })

  it("counts stamps per line and once across the network", () => {
    let progress = recordStop(emptyPlayProgress(), "L1", "X", true)
    progress = recordStop(progress, "L2", "X", true)
    progress = recordStop(progress, "L2", "D", true)
    expect(stampedOn(progress, red)).toBe(1)
    expect(stampedOn(progress, yellow)).toBe(2)
    expect(stampedTotal(progress, [red, yellow])).toBe(2)
  })

  it("keeps the best ride", () => {
    const progress = finishRide(finishRide(emptyPlayProgress(), 90), 40)
    expect(progress).toMatchObject({ best: 90, rides: 2 })
  })

  it("ignores a broken or older payload", () => {
    expect(readPlayProgress(memory({ [playStorageKey]: "{not-json" }))).toEqual(emptyPlayProgress())
    expect(
      readPlayProgress(memory({ [playStorageKey]: JSON.stringify({ streak: 4, best: 2, correct: 4, played: 4 }) })),
    ).toEqual(emptyPlayProgress())
    expect(
      readPlayProgress(
        memory({ [playStorageKey]: JSON.stringify({ v: 2, best: 10, stamps: { L1: ["A", 3, "A"] }, review: [] }) }),
      ),
    ).toEqual({ best: 10, rides: 0, stamps: { L1: ["A"] }, review: {}, modes: {}, learned: {}, missed: {} })
  })
})
