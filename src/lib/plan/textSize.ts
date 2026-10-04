export const textMin = 12
export const textMax = 22
export const textDefault = textMin
export const textStorageKey = "dms-text-size"

export function readTextSize(): number {
  try {
    const saved = localStorage.getItem(textStorageKey)
    const value = Number(saved)
    if (saved !== null && saved !== "" && Number.isFinite(value)) {
      return Math.min(textMax, Math.max(textMin, Math.round(value)))
    }
  } catch {
    // Storage can be blocked. The default still applies.
  }
  return textDefault
}
