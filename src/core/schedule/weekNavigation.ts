const DAY_IN_MS = 24 * 60 * 60 * 1000
const SCHEDULE_WEEK_VIEW_STORAGE_PREFIX = 'scheduleWeekView:'

type StoredScheduleWeekView = {
  semesterStartDate: string
  week: number
}

export type ScheduleWeekView = {
  week: number
  hasManualOverride: boolean
}

function parseDateParts(dateText: string) {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  const date = new Date(year, month - 1, day)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

function getStorageKey(scheduleId: string) {
  return `${SCHEDULE_WEEK_VIEW_STORAGE_PREFIX}${encodeURIComponent(scheduleId)}`
}

function isStoredScheduleWeekView(value: unknown): value is StoredScheduleWeekView {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.semesterStartDate === 'string' &&
    typeof candidate.week === 'number' &&
    Number.isInteger(candidate.week) &&
    candidate.week >= 1
  )
}

function readRememberedScheduleWeek(scheduleId: string, semesterStartDate: string) {
  try {
    const raw = localStorage.getItem(getStorageKey(scheduleId))
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isStoredScheduleWeekView(parsed) || parsed.semesterStartDate !== semesterStartDate) {
      localStorage.removeItem(getStorageKey(scheduleId))
      return null
    }

    return parsed.week
  } catch {
    return null
  }
}

export function getScheduleWeekNumber(date: Date, semesterStartDateText: string) {
  const semesterStart = parseDateParts(semesterStartDateText)
  if (!semesterStart || Number.isNaN(date.getTime())) {
    return 1
  }

  const semesterStartDay = Date.UTC(semesterStart.year, semesterStart.month - 1, semesterStart.day)
  const currentDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const differenceDays = Math.floor((currentDay - semesterStartDay) / DAY_IN_MS)
  const week = Math.floor(differenceDays / 7) + 1

  return Math.max(1, week)
}

export function resolveInitialScheduleWeekView(
  scheduleId: string,
  semesterStartDate: string,
  inferredCurrentWeek: number,
): ScheduleWeekView {
  const rememberedWeek = readRememberedScheduleWeek(scheduleId, semesterStartDate)
  if (rememberedWeek === null || rememberedWeek === inferredCurrentWeek) {
    clearRememberedScheduleWeek(scheduleId)
    return {
      week: inferredCurrentWeek,
      hasManualOverride: false,
    }
  }

  return {
    week: rememberedWeek,
    hasManualOverride: true,
  }
}

export function rememberScheduleWeek(scheduleId: string, semesterStartDate: string, week: number) {
  if (!Number.isInteger(week) || week < 1) {
    return false
  }

  try {
    const value: StoredScheduleWeekView = {
      semesterStartDate,
      week,
    }
    localStorage.setItem(getStorageKey(scheduleId), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function clearRememberedScheduleWeek(scheduleId: string) {
  try {
    localStorage.removeItem(getStorageKey(scheduleId))
    return true
  } catch {
    return false
  }
}
