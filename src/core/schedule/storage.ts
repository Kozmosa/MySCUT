import type { ScheduleData } from './types'

const SCHEDULE_STORAGE_KEY = 'scheduleData'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isScheduleData(value: unknown): value is ScheduleData {
  if (!isObject(value)) {
    return false
  }

  if (value.version !== 1 || value.source !== 'wakeup') {
    return false
  }

  if (!isObject(value.table) || !Array.isArray(value.courses) || !Array.isArray(value.lessons)) {
    return false
  }

  return true
}

export function loadScheduleData() {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!isScheduleData(parsed)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function saveScheduleData(scheduleData: ScheduleData) {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(scheduleData))
    return true
  } catch {
    return false
  }
}

export function clearScheduleData() {
  try {
    localStorage.removeItem(SCHEDULE_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
