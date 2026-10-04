const CLOCK = /^(\d{2}):([0-5]\d):([0-5]\d)$/

export function formatClock(value: string): string | null {
  const match = CLOCK.exec(value)
  if (!match) return null
  const hour24 = Number(match[1])
  if (hour24 > 23) return null
  const minute = match[2]
  const period = hour24 >= 12 ? "pm" : "am"
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${minute} ${period}`
}
