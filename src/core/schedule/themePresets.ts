export type ScheduleThemeId = 'skyBlue'

type ScheduleThemeMode = 'wakeup'

export type ScheduleThemePreset = {
  id: ScheduleThemeId
  name: string
  primaryColor: string
  mode: ScheduleThemeMode
  fallbackColors: string[]
}

export const SCHEDULE_THEME_PRESETS: ScheduleThemePreset[] = [
  {
    id: 'skyBlue',
    name: '天空蓝',
    primaryColor: '#63a9ff',
    mode: 'wakeup',
    fallbackColors: ['#d9e8ff', '#d8f3e7', '#ffe6cc', '#ffd9e6', '#e5ddff', '#d8f4ff', '#fff1bf'],
  },
]

export function getScheduleThemePresetById(themeId: string) {
  return SCHEDULE_THEME_PRESETS.find((preset) => preset.id === themeId) ?? SCHEDULE_THEME_PRESETS[0]
}
