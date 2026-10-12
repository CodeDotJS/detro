import { useLayoutEffect, useState, type RefObject } from "react"

/** On narrow screens, place the list where more visual-viewport space remains. */
export function useSuggestionPlacement(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
): "below" | "above" {
  const [place, setPlace] = useState<"below" | "above">("below")

  useLayoutEffect(() => {
    if (!open) {
      setPlace("below")
      return
    }

    function measure() {
      const el = anchorRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vv = window.visualViewport
      const top = vv?.offsetTop ?? 0
      const height = vv?.height ?? window.innerHeight
      const spaceAbove = Math.max(0, rect.top - top)
      const spaceBelow = Math.max(0, top + height - rect.bottom)
      setPlace(spaceBelow >= spaceAbove ? "below" : "above")
    }

    measure()
    const vv = window.visualViewport
    vv?.addEventListener("resize", measure)
    vv?.addEventListener("scroll", measure)
    window.addEventListener("resize", measure)
    return () => {
      vv?.removeEventListener("resize", measure)
      vv?.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
    }
  }, [open, anchorRef])

  return place
}
