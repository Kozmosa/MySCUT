import { SCHEDULE_THEME_PRESETS, type ScheduleThemeId } from './themePresets'
import type { ScheduleData } from './types'

type RgbColor = {
  red: number
  green: number
  blue: number
}

function parseHexColor(value: string): RgbColor | null {
  if (/^#[0-9a-fA-F]{8}$/.test(value)) {
    return {
      red: Number.parseInt(value.slice(3, 5), 16),
      green: Number.parseInt(value.slice(5, 7), 16),
      blue: Number.parseInt(value.slice(7, 9), 16),
    }
  }

  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return {
      red: Number.parseInt(value.slice(1, 3), 16),
      green: Number.parseInt(value.slice(3, 5), 16),
      blue: Number.parseInt(value.slice(5, 7), 16),
    }
  }

  return null
}

function computeColorDistance(left: RgbColor, right: RgbColor) {
  const redDiff = left.red - right.red
  const greenDiff = left.green - right.green
  const blueDiff = left.blue - right.blue

  return redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff
}

function getPresetPalette(presetId: ScheduleThemeId) {
  const preset = SCHEDULE_THEME_PRESETS.find((item) => item.id === presetId)
  if (!preset) {
    return []
  }

  return [preset.primaryColor, ...preset.fallbackColors]
    .map((item) => item.trim())
    .map(parseHexColor)
    .filter((item): item is RgbColor => Boolean(item))
}

function scorePresetSimilarity(courseColors: RgbColor[], palette: RgbColor[]) {
  if (courseColors.length === 0 || palette.length === 0) {
    return Number.POSITIVE_INFINITY
  }

  let totalDistance = 0

  for (const courseColor of courseColors) {
    let minDistance = Number.POSITIVE_INFINITY

    for (const paletteColor of palette) {
      const distance = computeColorDistance(courseColor, paletteColor)
      if (distance < minDistance) {
        minDistance = distance
      }
    }

    totalDistance += minDistance
  }

  return totalDistance / courseColors.length
}

export function resolveNearestPresetThemeIdForWakeup(scheduleData: ScheduleData): ScheduleThemeId {
  const presetCandidates = SCHEDULE_THEME_PRESETS.filter((preset) => preset.mode === 'preset')

  if (presetCandidates.length === 0) {
    return 'skyBlue'
  }

  const uniqueCourseColors = Array.from(
    new Set(
      scheduleData.courses
        .map((course) => course.color.trim())
        .filter((item) => item.length > 0),
    ),
  )

  const parsedCourseColors = uniqueCourseColors
    .map(parseHexColor)
    .filter((item): item is RgbColor => Boolean(item))

  let bestThemeId = presetCandidates[0].id
  let bestScore = Number.POSITIVE_INFINITY

  for (const candidate of presetCandidates) {
    const palette = getPresetPalette(candidate.id)
    const score = scorePresetSimilarity(parsedCourseColors, palette)

    if (score < bestScore) {
      bestScore = score
      bestThemeId = candidate.id
    }
  }

  return bestThemeId
}
