import { describe, expect, it } from "vitest"
import { readSelection, writeSelection } from "./selection"
import type { KeyValueStore } from "./trips"

function memory(): KeyValueStore {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  }
}

describe("saved station selection", () => {
  it("keeps the chosen stations across a reload", () => {
    const store = memory()
    writeSelection(store, { fromCode: "RI", toCode: "KG" })
    expect(readSelection(store)).toEqual({ fromCode: "RI", toCode: "KG" })
  })

  it("drops the record when both stations are cleared", () => {
    const store = memory()
    writeSelection(store, { fromCode: "RI", toCode: null })
    writeSelection(store, { fromCode: null, toCode: null })
    expect(readSelection(store)).toEqual({ fromCode: null, toCode: null })
  })
})
