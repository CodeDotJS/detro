import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { defaultTheme, isTheme, themeStorageKey, type ThemeName } from "./theme"

type ThemeContextValue = {
  theme: ThemeName
  resolvedTheme: ThemeName
  setTheme: (theme: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  resolvedTheme: defaultTheme,
  setTheme: () => undefined,
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(readTheme)
  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next)
    writeTheme(next)
  }, [])
  return <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme }}>{children}</ThemeContext.Provider>
}

function readTheme(): ThemeName {
  if (typeof document === "undefined") return defaultTheme
  const attr = document.documentElement.getAttribute("data-theme")
  if (isTheme(attr)) return attr
  try {
    const stored = localStorage.getItem(themeStorageKey)
    if (isTheme(stored)) return stored
  } catch {
    // The page already has a theme from the boot script.
  }
  return defaultTheme
}

function writeTheme(theme: ThemeName) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.setAttribute("data-theme", theme)
  root.style.colorScheme = theme === "night" ? "dark" : "light"
  try {
    localStorage.setItem(themeStorageKey, theme)
  } catch {
    // Theme still applies on this page.
  }
}
