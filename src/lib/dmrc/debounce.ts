export type SearchHit = {
  code: string
  name: string
}

export type DebouncedSearch<T extends SearchHit> = {
  push(query: string, deliver: (result: { stations: T[] } | { error: unknown }) => void): void
  cancel(): void
}

export function createDebouncedSearch<T extends SearchHit>(
  wait: number,
  run: (query: string, signal: AbortSignal) => Promise<T[]>,
): DebouncedSearch<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let current: AbortController | undefined

  return {
    push(query: string, deliver: (result: { stations: T[] } | { error: unknown }) => void) {
      if (timer) clearTimeout(timer)
      current?.abort()
      const trimmed = query.trim()
      if (!trimmed) {
        deliver({ stations: [] })
        return
      }
      timer = setTimeout(() => {
        const controller = new AbortController()
        current = controller
        run(trimmed, controller.signal).then(
          (stations) => {
            if (!controller.signal.aborted) deliver({ stations })
          },
          (error: unknown) => {
            if (!controller.signal.aborted) deliver({ error })
          },
        )
      }, wait)
    },
    cancel() {
      if (timer) clearTimeout(timer)
      current?.abort()
    },
  }
}
