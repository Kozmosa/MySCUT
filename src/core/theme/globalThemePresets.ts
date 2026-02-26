import type { GlobalThemePreset, ResolvedGlobalThemeMode } from './types'

export const LIGHT_THEME_PRESET: GlobalThemePreset = {
  mode: 'light',
  cssVariables: {
    '--bg-page': '#f5f6fa',
    '--bg-surface': '#ffffff',
    '--bg-surface-alt': '#f8faff',
    '--bg-surface-muted': '#f4f8ff',
    '--bg-soft': '#f6f8fc',
    '--text-primary': '#1f1f1f',
    '--text-strong': '#182338',
    '--text-secondary': '#72809a',
    '--text-muted': '#7b859a',
    '--text-accent': '#2f4f87',
    '--text-on-accent': '#ffffff',
    '--border-soft': '#e6e8ef',
    '--border-muted': '#edf0f6',
    '--border-strong': '#d9dfe8',
    '--overlay-glass': 'rgba(247, 250, 255, 0.58)',
    '--overlay-panel': 'rgba(255, 255, 255, 0.72)',
    '--overlay-border-top': 'rgba(218, 224, 237, 0.72)',
    '--shadow-nav': 'rgba(31, 35, 46, 0.08)',
    '--button-soft-bg': '#ecf2ff',
    '--button-soft-bg-active': '#dee8ff',
    '--button-soft-text': '#2f4f87',
    '--accent-primary': '#1677ff',
    '--avatar-grad-start': '#f7faff',
    '--avatar-grad-end': '#dbe8ff',
    '--avatar-border': '#d7e3ff',
    '--avatar-text': '#4a5f85',
    '--switch-active-border': '#7eaef6',
  },
}

export const DARK_THEME_PRESET: GlobalThemePreset = {
  mode: 'dark',
  cssVariables: {
    '--bg-page': '#12161d',
    '--bg-surface': '#1b212b',
    '--bg-surface-alt': '#212938',
    '--bg-surface-muted': '#232d3c',
    '--bg-soft': '#252f40',
    '--text-primary': '#e4e9f2',
    '--text-strong': '#f1f4fb',
    '--text-secondary': '#a8b2c5',
    '--text-muted': '#98a4bb',
    '--text-accent': '#c8d9ff',
    '--text-on-accent': '#f4f8ff',
    '--border-soft': '#2f3a4f',
    '--border-muted': '#334158',
    '--border-strong': '#3a4a64',
    '--overlay-glass': 'rgba(20, 26, 36, 0.76)',
    '--overlay-panel': 'rgba(31, 40, 56, 0.76)',
    '--overlay-border-top': 'rgba(71, 86, 112, 0.72)',
    '--shadow-nav': 'rgba(5, 8, 12, 0.36)',
    '--button-soft-bg': '#2a3750',
    '--button-soft-bg-active': '#334564',
    '--button-soft-text': '#d1deff',
    '--accent-primary': '#7fb1ff',
    '--avatar-grad-start': '#263448',
    '--avatar-grad-end': '#344867',
    '--avatar-border': '#3f5476',
    '--avatar-text': '#d5dff2',
    '--switch-active-border': '#89b6ff',
  },
}

const PRESET_MAP: Record<ResolvedGlobalThemeMode, GlobalThemePreset> = {
  light: LIGHT_THEME_PRESET,
  dark: DARK_THEME_PRESET,
}

export function getGlobalThemePreset(mode: ResolvedGlobalThemeMode) {
  return PRESET_MAP[mode]
}
