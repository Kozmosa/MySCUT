import { ConfigProvider, theme as antdTheme } from 'antd'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { getGlobalThemePreset } from '../../../core/theme/globalThemePresets'
import {
  getPreferredGlobalThemeMode,
  resolveGlobalThemeMode,
  setStoredGlobalThemeMode,
} from '../../../core/theme/globalThemeStorage'
import type { GlobalThemeMode, ResolvedGlobalThemeMode } from '../../../core/theme/types'

const THEME_TRANSITION_CLASS = 'theme-transitioning'
const THEME_TRANSITION_MS = 240
let themeTransitionTimer: number | null = null

type GlobalThemeContextValue = {
  mode: GlobalThemeMode
  resolvedMode: ResolvedGlobalThemeMode
  setMode: (mode: GlobalThemeMode) => void
  toggleLightDark: () => void
}

const GlobalThemeContext = createContext<GlobalThemeContextValue | null>(null)

function applyGlobalThemeVariables(resolvedMode: ResolvedGlobalThemeMode) {
  const preset = getGlobalThemePreset(resolvedMode)
  const root = document.documentElement

  root.dataset.globalTheme = resolvedMode
  root.style.colorScheme = resolvedMode

  for (const [name, value] of Object.entries(preset.cssVariables)) {
    root.style.setProperty(name, value)
  }
}

function startThemeTransition() {
  if (typeof window === 'undefined') {
    return
  }

  const root = document.documentElement

  if (themeTransitionTimer !== null) {
    window.clearTimeout(themeTransitionTimer)
  }

  root.classList.add(THEME_TRANSITION_CLASS)

  themeTransitionTimer = window.setTimeout(() => {
    root.classList.remove(THEME_TRANSITION_CLASS)
    themeTransitionTimer = null
  }, THEME_TRANSITION_MS)
}

type GlobalThemeProviderProps = {
  children: ReactNode
}

export function GlobalThemeProvider({ children }: GlobalThemeProviderProps) {
  const [mode, setModeState] = useState<GlobalThemeMode>(() => getPreferredGlobalThemeMode())
  const [resolvedMode, setResolvedMode] = useState<ResolvedGlobalThemeMode>(() => resolveGlobalThemeMode(mode))

  useEffect(() => {
    const nextResolvedMode = resolveGlobalThemeMode(mode)
    setResolvedMode(nextResolvedMode)
    applyGlobalThemeVariables(nextResolvedMode)
  }, [mode])

  useEffect(() => {
    if (mode !== 'system' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemThemeChange = () => {
      const nextResolvedMode = mediaQuery.matches ? 'dark' : 'light'
      startThemeTransition()
      setResolvedMode(nextResolvedMode)
      applyGlobalThemeVariables(nextResolvedMode)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange)
      }
    }

    mediaQuery.addListener(handleSystemThemeChange)
    return () => {
      mediaQuery.removeListener(handleSystemThemeChange)
    }
  }, [mode])

  const setMode = (nextMode: GlobalThemeMode) => {
    startThemeTransition()
    setModeState(nextMode)
    setStoredGlobalThemeMode(nextMode)
  }

  const toggleLightDark = () => {
    setMode(resolvedMode === 'dark' ? 'light' : 'dark')
  }

  const contextValue = useMemo(
    () => ({
      mode,
      resolvedMode,
      setMode,
      toggleLightDark,
    }),
    [mode, resolvedMode],
  )

  const preset = getGlobalThemePreset(resolvedMode)
  const algorithm = resolvedMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm

  return (
    <GlobalThemeContext.Provider value={contextValue}>
      <ConfigProvider
        theme={{
          algorithm,
          token: {
            colorPrimary: preset.cssVariables['--accent-primary'],
            colorBgBase: preset.cssVariables['--bg-page'],
            colorTextBase: preset.cssVariables['--text-primary'],
            colorBorder: preset.cssVariables['--border-soft'],
          },
        }}
      >
        {children}
      </ConfigProvider>
    </GlobalThemeContext.Provider>
  )
}

export function useGlobalTheme() {
  const context = useContext(GlobalThemeContext)
  if (!context) {
    throw new Error('useGlobalTheme must be used within GlobalThemeProvider')
  }

  return context
}
