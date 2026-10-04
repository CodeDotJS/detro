export const textMin = 12
export const textMax = 22
export const textDefault = 13

export function readTextSize(): number {
  try {
    const saved = localStorage.getItem("dms-text")
    if (saved === "small") return 13
    if (saved === "normal") return 16
    if (saved === "large") return 19
    const value = Number(saved)
    if (Number.isFinite(value)) return Math.min(textMax, Math.max(textMin, Math.round(value)))
  } catch {
    // Storage can be blocked. The default still applies.
  }
  return textDefault
}
