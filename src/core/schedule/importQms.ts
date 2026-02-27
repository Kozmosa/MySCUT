import type { SavedSchedule, ScheduleData } from './types'

type QmsPayload = {
  schema: 'qms'
  version: 1
  exportedAt: number
  schedule: SavedSchedule
}

type ParsedQmsResult = {
  scheduleData: ScheduleData
  themeId: string
  semesterStartDate: string
  preferredName: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isScheduleData(value: unknown): value is ScheduleData {
  if (!isObject(value)) {
    return false
  }

  if (value.version !== 1) {
    return false
  }

  if (value.source !== 'wakeup' && value.source !== 'scutHtml') {
    return false
  }

  if (!isObject(value.table) || !Array.isArray(value.courses) || !Array.isArray(value.lessons)) {
    return false
  }

  return true
}

function isSavedSchedule(value: unknown): value is SavedSchedule {
  if (!isObject(value)) {
    return false
  }

  if (typeof value.id !== 'string' || typeof value.name !== 'string') {
    return false
  }

  if (typeof value.themeId !== 'string' || typeof value.semesterStartDate !== 'string') {
    return false
  }

  if (!isScheduleData(value.scheduleData)) {
    return false
  }

  return true
}

function isQmsPayload(value: unknown): value is QmsPayload {
  if (!isObject(value)) {
    return false
  }

  if (value.schema !== 'qms' || value.version !== 1 || typeof value.exportedAt !== 'number') {
    return false
  }

  return isSavedSchedule(value.schedule)
}

export function parseQmsScheduleText(text: string): ParsedQmsResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('QMS 文件解析失败：JSON 格式无效')
  }

  if (!isQmsPayload(parsed)) {
    throw new Error('QMS 文件结构无效或版本不受支持')
  }

  const schedule = parsed.schedule

  return {
    scheduleData: schedule.scheduleData,
    themeId: schedule.themeId,
    semesterStartDate: schedule.semesterStartDate,
    preferredName: schedule.name,
  }
}
