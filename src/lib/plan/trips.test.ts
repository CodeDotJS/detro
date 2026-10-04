import { describe, expect, it } from "vitest"
import { clearTrips, readTripQuery, readTrips, removeTrip, saveTrip, tripQuery, type KeyValueStore } from "./trips"

function memory(): KeyValueStore {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

describe("saved trips", () => {
  it("saves a trip and reopens the same station codes", () => {
    const store = memory()
    saveTrip(store, { fromCode: "RI", toCode: "KG" })
    expect(readTrips(store)).toEqual([{ fromCode: "RI", toCode: "KG" }])
  })

  it("keeps the newest copy of a repeated trip first", () => {
    const store = memory()
    saveTrip(store, { fromCode: "RI", toCode: "KG" })
    saveTrip(store, { fromCode: "SAKT", toCode: "RI" })
    saveTrip(store, { fromCode: "RI", toCode: "KG" })
    expect(readTrips(store).map((trip) => trip.fromCode)).toEqual(["RI", "SAKT"])
  })

  it("removes one saved trip and leaves the others", () => {
    const store = memory()
    saveTrip(store, { fromCode: "RI", toCode: "KG" })
    saveTrip(store, { fromCode: "SAKT", toCode: "RI" })
    expect(removeTrip(store, { fromCode: "RI", toCode: "KG" })).toEqual([{ fromCode: "SAKT", toCode: "RI" }])
    expect(readTrips(store)).toEqual([{ fromCode: "SAKT", toCode: "RI" }])
  })

  it("clears saved trips", () => {
    const store = memory()
    saveTrip(store, { fromCode: "RI", toCode: "KG" })
    clearTrips(store)
    expect(readTrips(store)).toEqual([])
  })
})

describe("shared route links", () => {
  it("keeps only station codes in the link", () => {
    expect(tripQuery("RI", "KG")).toBe("?from=RI&to=KG")
    expect(readTripQuery("?from=RI&to=KG&lat=28.6&lng=77.2")).toEqual({
      fromCode: "RI",
      toCode: "KG",
    })
  })

  it("ignores a link without both stations", () => {
    expect(readTripQuery("?from=RI")).toBeNull()
    expect(readTripQuery("?from=RI%20West&to=KG")).toBeNull()
  })
})
