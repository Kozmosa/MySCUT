import type { GlobalThemeFamily, GlobalThemePreset, ResolvedGlobalThemeMode } from './types'

type GlobalThemeFamilyOption = {
  id: GlobalThemeFamily
  name: string
}

export const GLOBAL_THEME_FAMILY_OPTIONS: GlobalThemeFamilyOption[] = [
  { id: 'default', name: '默认' },
  { id: 'palacePlum', name: '宫墙红梅' },
]

export const DEFAULT_LIGHT_THEME_PRESET: GlobalThemePreset = {
  family: 'default',
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

export const DEFAULT_DARK_THEME_PRESET: GlobalThemePreset = {
  family: 'default',
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

export const PALACE_PLUM_LIGHT_THEME_PRESET: GlobalThemePreset = {
  family: 'palacePlum',
  mode: 'light',
  cssVariables: {
    '--bg-page': '#f6f0ef',
    '--bg-surface': '#fff9f8',
    '--bg-surface-alt': '#fcf2f0',
    '--bg-surface-muted': '#f8e8e5',
    '--bg-soft': '#f4e4e1',
    '--text-primary': '#3f2329',
    '--text-strong': '#32171d',
    '--text-secondary': '#7f565f',
    '--text-muted': '#93676f',
    '--text-accent': '#9b1e64',
    '--text-on-accent': '#fff7f8',
    '--border-soft': '#e9d6d8',
    '--border-muted': '#f0e1e2',
    '--border-strong': '#debec4',
    '--overlay-glass': 'rgba(255, 246, 245, 0.62)',
    '--overlay-panel': 'rgba(255, 250, 249, 0.76)',
    '--overlay-border-top': 'rgba(229, 198, 205, 0.72)',
    '--shadow-nav': 'rgba(66, 29, 37, 0.14)',
    '--button-soft-bg': '#f2dde2',
    '--button-soft-bg-active': '#ebcfd7',
    '--button-soft-text': '#7f274f',
    '--accent-primary': '#9b1e64',
    '--avatar-grad-start': '#fff4f5',
    '--avatar-grad-end': '#f0d9de',
    '--avatar-border': '#e4c5cc',
    '--avatar-text': '#6e3547',
    '--switch-active-border': '#c54b86',
  },
}

export const PALACE_PLUM_DARK_THEME_PRESET: GlobalThemePreset = {
  family: 'palacePlum',
  mode: 'dark',
  cssVariables: {
    '--bg-page': '#1b1319',
    '--bg-surface': '#251922',
    '--bg-surface-alt': '#2b1f29',
    '--bg-surface-muted': '#302330',
    '--bg-soft': '#352733',
    '--text-primary': '#f1dee7',
    '--text-strong': '#f8eaf1',
    '--text-secondary': '#c5a2b0',
    '--text-muted': '#b58f9d',
    '--text-accent': '#f0a3c8',
    '--text-on-accent': '#2f0f1e',
    '--border-soft': '#4a3442',
    '--border-muted': '#5a3e50',
    '--border-strong': '#68475d',
    '--overlay-glass': 'rgba(35, 23, 31, 0.78)',
    '--overlay-panel': 'rgba(45, 30, 40, 0.8)',
    '--overlay-border-top': 'rgba(115, 79, 98, 0.72)',
    '--shadow-nav': 'rgba(8, 4, 7, 0.46)',
    '--button-soft-bg': '#4a2f3f',
    '--button-soft-bg-active': '#5a3850',
    '--button-soft-text': '#f4c2da',
    '--accent-primary': '#c84a87',
    '--avatar-grad-start': '#402a37',
    '--avatar-grad-end': '#5a384d',
    '--avatar-border': '#6e4660',
    '--avatar-text': '#f0c7d9',
    '--switch-active-border': '#d86da3',
  },
}

const PRESET_MAP: Record<GlobalThemeFamily, Record<ResolvedGlobalThemeMode, GlobalThemePreset>> = {
  default: {
    light: DEFAULT_LIGHT_THEME_PRESET,
    dark: DEFAULT_DARK_THEME_PRESET,
  },
  palacePlum: {
    light: PALACE_PLUM_LIGHT_THEME_PRESET,
    dark: PALACE_PLUM_DARK_THEME_PRESET,
  },
}

export function getGlobalThemePreset(mode: ResolvedGlobalThemeMode, family: GlobalThemeFamily = 'default') {
  return PRESET_MAP[family][mode]
}
