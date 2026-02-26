import type { GlobalThemeMode, ResolvedGlobalThemeMode } from './types'

const GLOBAL_THEME_STORAGE_KEY = 'globalThemeMode'

function isGlobalThemeMode(value: unknown): value is GlobalThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function getStoredGlobalThemeMode() {
  try {
    const value = localStorage.getItem(GLOBAL_THEME_STORAGE_KEY)
    return isGlobalThemeMode(value) ? value : null
  } catch {
    return null
  }
}

export function setStoredGlobalThemeMode(mode: GlobalThemeMode) {
  try {
    localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, mode)
    return true
  } catch {
    return false
  }
}

export function getPreferredGlobalThemeMode() {
  return getStoredGlobalThemeMode() ?? 'light'
}

export function resolveGlobalThemeMode(mode: GlobalThemeMode): ResolvedGlobalThemeMode {
  if (mode !== 'system') {
    return mode
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
