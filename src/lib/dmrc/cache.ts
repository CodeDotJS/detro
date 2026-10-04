import type { LineChip } from "../transit/types"
import type { Lang } from "../transit/types"

const lineIndexes = new Map<Lang, Map<string, LineChip[]>>()

export function readLineCache(lang: Lang): Map<string, LineChip[]> | null {
  return lineIndexes.get(lang) ?? null
}

export function writeLineCache(lang: Lang, index: Map<string, LineChip[]>): void {
  lineIndexes.set(lang, index)
}
