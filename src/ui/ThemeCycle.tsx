import { useEffect } from "react"
import { Contrast, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import type { Copy } from "../i18n/copy"
import { defaultTheme, isTheme, nextTheme, themeColor, type ThemeName } from "../lib/plan/theme"

export function ThemeChrome() {
  const { theme, resolvedTheme } = useTheme()
  const current = readTheme(theme, resolvedTheme)
  useEffect(() => {
    const root = document.documentElement
    root.style.backgroundColor = ""
    root.style.colorScheme = ""
    const tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (tag) tag.content = themeColor[current]
  }, [current])
  return null
}

export function ThemeCycle({ copy, named = false }: { copy: Copy; named?: boolean }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const current = readTheme(theme, resolvedTheme)
  const label = copy.themeName[current]
  return (
    <button
      type="button"
      className={named ? "theme-cycle is-named" : "theme-cycle"}
      aria-label={copy.themeSwitch(label)}
      onClick={() => setTheme(nextTheme(current))}
    >
      <ThemeGlyph name={current} />
      <span className="theme-cycle-name" aria-hidden="true">
        {label}
      </span>
    </button>
  )
}

function readTheme(theme: string | undefined, resolved: string | undefined): ThemeName {
  if (isTheme(theme)) return theme
  if (isTheme(resolved)) return resolved
  return defaultTheme
}

function ThemeGlyph({ name }: { name: ThemeName }) {
  if (name === "night") return <Moon aria-hidden="true" size={18} strokeWidth={2.25} />
  if (name === "contrast") return <Contrast aria-hidden="true" size={18} strokeWidth={2.25} />
  return <Sun aria-hidden="true" size={18} strokeWidth={2.25} />
}
