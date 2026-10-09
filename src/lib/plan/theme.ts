export const themes = ["day", "night", "contrast"] as const

export type ThemeName = (typeof themes)[number]

export const defaultTheme: ThemeName = "day"
export const themeStorageKey = "dms-theme"

export const themeColor: Record<ThemeName, string> = {
  day: "#16181d",
  night: "#101218",
  contrast: "#000000",
}

export const themePage: Record<ThemeName, string> = {
  day: "#eef1f5",
  night: "#101218",
  contrast: "#ffffff",
}

export function isTheme(value: string | null | undefined): value is ThemeName {
  return value === "day" || value === "night" || value === "contrast"
}

export function nextTheme(current: string | null | undefined): ThemeName {
  const index = isTheme(current) ? themes.indexOf(current) : 0
  return themes[(index + 1) % themes.length]
}
