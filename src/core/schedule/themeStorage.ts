import {
  getScheduleThemePresetById,
  type ScheduleThemeId,
  type ScheduleThemePreset,
} from './themePresets'

const SCHEDULE_THEME_STORAGE_KEY = 'scheduleThemeId'

export function getScheduleThemeId() {
  try {
    return localStorage.getItem(SCHEDULE_THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setScheduleThemeId(themeId: ScheduleThemeId) {
  try {
    localStorage.setItem(SCHEDULE_THEME_STORAGE_KEY, themeId)
    return true
  } catch {
    return false
  }
}

export function getScheduleThemePreset(): ScheduleThemePreset {
  const themeId = getScheduleThemeId()
  if (!themeId) {
    return getScheduleThemePresetById('')
  }

  return getScheduleThemePresetById(themeId)
}
