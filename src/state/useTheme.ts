import { useCallback, useEffect, useState } from 'react'

/** 'system' follows the operating system's light or dark setting. */
export type Theme = 'system' | 'light' | 'dark'

// Also read by the inline script in index.html, which applies the theme before
// the page first draws so dark mode doesn't flash white. Keep the two in step.
const STORAGE_KEY = 'ballast:theme'

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Blocked storage: fall back to the system setting.
  }
  return 'system'
}

/** The chosen theme, applied as data-theme on <html> and remembered in this browser. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme)

  // index.css switches its color tokens on this attribute.
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // The choice still applies until the page is closed.
    }
    setThemeState(next)
  }, [])

  return { theme, setTheme }
}
