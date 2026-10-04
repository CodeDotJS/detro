const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

export type SwapDelta = { dx: number; dy: number }

export function measureSwap(first: HTMLElement | null, second: HTMLElement | null): SwapDelta | null {
  if (!first || !second) return null
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null
  const start = first.getBoundingClientRect()
  const end = second.getBoundingClientRect()
  const dx = end.left - start.left
  const dy = end.top - start.top
  if (Math.hypot(dx, dy) < 2) return null
  return { dx, dy }
}

export function playSwap(first: HTMLElement | null, second: HTMLElement | null, delta: SwapDelta | null) {
  if (!first || !second || !delta) return
  const { dx, dy } = delta
  const options: KeyframeAnimationOptions = { duration: 320, easing: EASE }
  first.classList.add("swap-crossing")
  second.classList.add("swap-crossing")
  const clear = () => {
    first.classList.remove("swap-crossing")
    second.classList.remove("swap-crossing")
  }
  first.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
    options,
  ).onfinish = clear
  second.animate(
    [{ transform: `translate(${-dx}px, ${-dy}px)` }, { transform: "translate(0, 0)" }],
    options,
  )
}
