import type { GlobalThemeFamily, GlobalThemeMode, ResolvedGlobalThemeMode } from './types'

const GLOBAL_THEME_STORAGE_KEY = 'globalThemeMode'
const GLOBAL_THEME_FAMILY_STORAGE_KEY = 'globalThemeFamily'

function isGlobalThemeMode(value: unknown): value is GlobalThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

function isGlobalThemeFamily(value: unknown): value is GlobalThemeFamily {
  return (
    value === 'default' ||
    value === 'bambooGrove' ||
    value === 'palacePlum' ||
    value === 'mistyJiangnan' ||
    value === 'luoyangPeony' ||
    value === 'dunhuangApsaras' ||
    value === 'autumnOsmanthus'
  )
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

export function getStoredGlobalThemeFamily() {
  try {
    const value = localStorage.getItem(GLOBAL_THEME_FAMILY_STORAGE_KEY)
    return isGlobalThemeFamily(value) ? value : null
  } catch {
    return null
  }
}

export function setStoredGlobalThemeFamily(family: GlobalThemeFamily) {
  try {
    localStorage.setItem(GLOBAL_THEME_FAMILY_STORAGE_KEY, family)
    return true
  } catch {
    return false
  }
}

export function getPreferredGlobalThemeFamily() {
  return getStoredGlobalThemeFamily() ?? 'default'
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
