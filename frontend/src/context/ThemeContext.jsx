import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext()

const STORAGE_KEY = 'saksham-theme'

function getInitialDark() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function applyTheme(dark) {
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [dark, setDarkState] = useState(getInitialDark)

  useEffect(() => {
    applyTheme(dark)

    // Follow the OS preference only while the user has no explicit choice.
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setDarkState(event.matches)
      }
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [dark])

  const setDark = useCallback((value) => {
    setDarkState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light')
    } catch {
      // Storage unavailable (private mode / quota) — fall back to in-session only.
    }
  }, [])

  const toggle = useCallback(() => {
    setDarkState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ dark, toggle, setDark }), [dark, toggle, setDark])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}