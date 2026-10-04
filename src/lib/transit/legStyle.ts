import type { Lang, Leg } from "./types"
import type { LineSequence } from "./route"

export function matchingLine(leg: Leg, lines: LineSequence[], lang: Lang): LineSequence | undefined {
  if (leg.lineCode) {
    const byCode = lines.find((line) => line.code === leg.lineCode)
    if (byCode) return byCode
  }
  return lines.find((line) => {
    const name = line.label[lang].colorName || line.label.en.colorName
    const english = line.label.en.colorName
    return (
      leg.lineName === name ||
      leg.lineName === english ||
      leg.lineName.startsWith(`${name} (`) ||
      leg.lineName.startsWith(`${english} (`)
    )
  })
}

export function legColor(leg: Leg, lines: LineSequence[], lang: Lang): string {
  return matchingLine(leg, lines, lang)?.label.en.color || "#5c6570"
}

/** Dark or light ink that stays readable on a line-color chip. */
export function inkOn(hex: string): string {
  const h = hex.trim().replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#16181d"
  const channel = (start: number) => {
    const value = Number.parseInt(h.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return luminance > 0.42 ? "#16181d" : "#fffdf8"
}
