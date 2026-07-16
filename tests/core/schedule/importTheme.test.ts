import { describe, expect, it } from 'vitest'
import {
  resolveScheduleImportThemePreset,
  SCHEDULE_THEME_PRESETS,
} from '../../../src/core/schedule/themePresets'

describe('resolveScheduleImportThemePreset', () => {
  it('keeps the preset currently selected by the user', () => {
    expect(resolveScheduleImportThemePreset('palacePlum').id).toBe('palacePlum')
  })

  it('falls back to the first preset when no valid selection exists', () => {
    const firstPreset = SCHEDULE_THEME_PRESETS[0]

    expect(resolveScheduleImportThemePreset(null)).toBe(firstPreset)
    expect(resolveScheduleImportThemePreset(undefined)).toBe(firstPreset)
    expect(resolveScheduleImportThemePreset('missing-theme')).toBe(firstPreset)
  })
})
