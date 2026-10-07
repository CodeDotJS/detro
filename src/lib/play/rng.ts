export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let next = state
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

export function pickIndex(rng: () => number, length: number): number {
  if (length <= 0) return 0
  return Math.min(length - 1, Math.floor(rng() * length))
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = pickIndex(rng, index + 1)
    ;[next[index], next[swap]] = [next[swap], next[index]]
  }
  return next
}
