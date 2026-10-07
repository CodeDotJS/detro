import { useEffect, useRef, useState } from "react"
import { QUICK_MS } from "../lib/play/ride"

/** True once the doors bar has finished for this question. */
export function useDoorsShut(asking: boolean, step: number): boolean {
  const [shut, setShut] = useState(false)
  useEffect(() => {
    setShut(false)
    if (!asking) return
    const id = window.setTimeout(() => setShut(true), QUICK_MS)
    return () => window.clearTimeout(id)
  }, [asking, step])
  return shut
}

/** Moves on by itself after an answer, sooner after a right one. */
export function useAutoAdvance(answered: boolean, waitMs: number, key: string, advance: () => void): void {
  const advanceRef = useRef(advance)
  advanceRef.current = advance
  useEffect(() => {
    if (!answered) return
    const id = window.setTimeout(() => advanceRef.current(), waitMs)
    return () => window.clearTimeout(id)
  }, [answered, waitMs, key])
}

export function useCountUp(target: number): number {
  const [value, setValue] = useState(target)
  useEffect(() => {
    if (typeof window.requestAnimationFrame !== "function" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target)
      return
    }
    let start = 0
    let frame = 0
    const tick = (now: number) => {
      if (!start) start = now
      const share = Math.min(1, (now - start) / 700)
      setValue(Math.round(target * (1 - (1 - share) ** 3)))
      if (share < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [target])
  return value
}
