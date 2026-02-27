import { ConfigProvider, theme as antdTheme } from 'antd'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { getGlobalThemePreset } from '../../../core/theme/globalThemePresets'
import {
  getPreferredGlobalThemeFamily,
  getPreferredGlobalThemeMode,
  resolveGlobalThemeMode,
  setStoredGlobalThemeFamily,
  setStoredGlobalThemeMode,
} from '../../../core/theme/globalThemeStorage'
import type { GlobalThemeFamily, GlobalThemeMode, ResolvedGlobalThemeMode } from '../../../core/theme/types'
import { syncStatusBarStyleForTheme } from '../../capacitor/syncStatusBarStyle'

const THEME_TRANSITION_CLASS = 'theme-transitioning'
const THEME_TRANSITION_MS = 240
let themeTransitionTimer: number | null = null

type GlobalThemeContextValue = {
  themeFamily: GlobalThemeFamily
  mode: GlobalThemeMode
  resolvedMode: ResolvedGlobalThemeMode
  setThemeFamily: (family: GlobalThemeFamily) => void
  setMode: (mode: GlobalThemeMode) => void
  toggleLightDark: () => void
}

const GlobalThemeContext = createContext<GlobalThemeContextValue | null>(null)

function applyGlobalThemeVariables(themeFamily: GlobalThemeFamily, resolvedMode: ResolvedGlobalThemeMode) {
  const preset = getGlobalThemePreset(resolvedMode, themeFamily)
  const root = document.documentElement

  root.dataset.globalTheme = `${themeFamily}-${resolvedMode}`
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
  const [themeFamily, setThemeFamilyState] = useState<GlobalThemeFamily>(() => getPreferredGlobalThemeFamily())
  const [mode, setModeState] = useState<GlobalThemeMode>(() => getPreferredGlobalThemeMode())
  const [resolvedMode, setResolvedMode] = useState<ResolvedGlobalThemeMode>(() => resolveGlobalThemeMode(mode))

  const applyResolvedTheme = (nextResolvedMode: ResolvedGlobalThemeMode) => {
    applyGlobalThemeVariables(themeFamily, nextResolvedMode)
    void syncStatusBarStyleForTheme(nextResolvedMode)
  }

  useEffect(() => {
    const nextResolvedMode = resolveGlobalThemeMode(mode)
    setResolvedMode(nextResolvedMode)
    applyResolvedTheme(nextResolvedMode)
  }, [mode, themeFamily])

  useEffect(() => {
    if (mode !== 'system' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemThemeChange = () => {
      const nextResolvedMode = mediaQuery.matches ? 'dark' : 'light'
      startThemeTransition()
      setResolvedMode(nextResolvedMode)
      applyResolvedTheme(nextResolvedMode)
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

  const setThemeFamily = (nextThemeFamily: GlobalThemeFamily) => {
    startThemeTransition()
    setThemeFamilyState(nextThemeFamily)
    setStoredGlobalThemeFamily(nextThemeFamily)
  }

  const toggleLightDark = () => {
    setMode(resolvedMode === 'dark' ? 'light' : 'dark')
  }

  const contextValue = useMemo(
    () => ({
      mode,
      resolvedMode,
      themeFamily,
      setThemeFamily,
      setMode,
      toggleLightDark,
    }),
    [mode, resolvedMode, themeFamily],
  )

  const preset = getGlobalThemePreset(resolvedMode, themeFamily)
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
