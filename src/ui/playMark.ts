export const RIGHT_MS = 950
export const MISS_MS = 2400

export function chipState(code: string, picked: string | null, answer: string): "right" | "wrong" | "answer" | null {
  if (!picked) return null
  if (code === picked && code === answer) return "right"
  if (code === picked) return "wrong"
  if (code === answer) return "answer"
  return null
}
