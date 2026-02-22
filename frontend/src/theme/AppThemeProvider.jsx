import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { getTheme } from './index'

const STORAGE_KEY = 'tms-theme-mode'
const AppThemeContext = createContext({ mode: 'light', toggleMode: () => {} })

function getInitialMode() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const theme = useMemo(() => getTheme(mode), [mode])
  const value = useMemo(
    () => ({
      mode,
      toggleMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
    }),
    [mode],
  )

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppThemeContext.Provider>
  )
}

export function useAppTheme() {
  return useContext(AppThemeContext)
}
