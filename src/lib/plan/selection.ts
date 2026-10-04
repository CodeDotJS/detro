import type { KeyValueStore } from "./trips"

const KEY = "dms-selection"

export type Selection = {
  fromCode: string | null
  toCode: string | null
}

export function readSelection(store: KeyValueStore): Selection {
  try {
    const raw = store.getItem(KEY)
    if (!raw) return { fromCode: null, toCode: null }
    const parsed = JSON.parse(raw) as Partial<Selection>
    return {
      fromCode: codeOrNull(parsed.fromCode),
      toCode: codeOrNull(parsed.toCode),
    }
  } catch {
    return { fromCode: null, toCode: null }
  }
}

export function writeSelection(store: KeyValueStore, selection: Selection): void {
  if (!selection.fromCode && !selection.toCode) {
    store.removeItem(KEY)
    return
  }
  store.setItem(KEY, JSON.stringify(selection))
}

function codeOrNull(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9]+$/.test(value) ? value : null
}
