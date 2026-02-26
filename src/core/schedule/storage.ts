import type { SavedSchedule, ScheduleData } from './types'

const SCHEDULE_STORAGE_KEY = 'scheduleData'
const SCHEDULE_LIBRARY_STORAGE_KEY = 'scheduleLibrary'

type ScheduleLibrary = {
  version: 1
  activeScheduleId: string
  schedules: SavedSchedule[]
}

type SaveScheduleOptions = {
  themeId: string
  semesterStartDate: string
  preferredName?: string
  setActive?: boolean
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

function isScheduleLibrary(value: unknown): value is ScheduleLibrary {
  if (!isObject(value)) {
    return false
  }

  if (value.version !== 1 || typeof value.activeScheduleId !== 'string' || !Array.isArray(value.schedules)) {
    return false
  }

  return value.schedules.every(isSavedSchedule)
}

function createScheduleId() {
  return `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function readLegacyScheduleData() {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return isScheduleData(parsed) ? parsed : null
  } catch {
    return null
  }
}

function readScheduleLibrary() {
  try {
    const raw = localStorage.getItem(SCHEDULE_LIBRARY_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!isScheduleLibrary(parsed)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeScheduleLibrary(library: ScheduleLibrary) {
  try {
    localStorage.setItem(SCHEDULE_LIBRARY_STORAGE_KEY, JSON.stringify(library))
    return true
  } catch {
    return false
  }
}

function buildSavedSchedule(scheduleData: ScheduleData, options: SaveScheduleOptions): SavedSchedule {
  return {
    id: createScheduleId(),
    name: options.preferredName || scheduleData.table.name || '未命名课表',
    source: scheduleData.source,
    themeId: options.themeId,
    semesterStartDate: options.semesterStartDate,
    createdAt: Date.now(),
    scheduleData,
  }
}

function ensureScheduleLibrary() {
  const existingLibrary = readScheduleLibrary()
  if (existingLibrary) {
    return existingLibrary
  }

  const legacyScheduleData = readLegacyScheduleData()
  if (!legacyScheduleData) {
    return null
  }

  const migratedSchedule: SavedSchedule = {
    id: 'legacy-schedule',
    name: legacyScheduleData.table.name || '历史课表',
    source: legacyScheduleData.source,
    themeId: localStorage.getItem('scheduleThemeId') || 'skyBlue',
    semesterStartDate: localStorage.getItem('semesterStartDate') || '2026-02-23',
    createdAt: legacyScheduleData.importedAt || Date.now(),
    scheduleData: legacyScheduleData,
  }

  const migratedLibrary: ScheduleLibrary = {
    version: 1,
    activeScheduleId: migratedSchedule.id,
    schedules: [migratedSchedule],
  }

  writeScheduleLibrary(migratedLibrary)

  return migratedLibrary
}

function findActiveSchedule(library: ScheduleLibrary) {
  return (
    library.schedules.find((schedule) => schedule.id === library.activeScheduleId) ??
    library.schedules[0] ??
    null
  )
}

export function saveScheduleData(scheduleData: ScheduleData) {
  const fallbackThemeId = localStorage.getItem('scheduleThemeId') || 'skyBlue'
  const fallbackSemesterStartDate = localStorage.getItem('semesterStartDate') || '2026-02-23'

  return saveScheduleDataWithOptions(scheduleData, {
    themeId: fallbackThemeId,
    semesterStartDate: fallbackSemesterStartDate,
    preferredName: scheduleData.table.name,
    setActive: true,
  })
}

export function saveScheduleDataWithOptions(scheduleData: ScheduleData, options: SaveScheduleOptions) {
  const library = ensureScheduleLibrary()
  const nextSchedule = buildSavedSchedule(scheduleData, options)

  const nextLibrary: ScheduleLibrary = library
    ? {
        ...library,
        activeScheduleId: options.setActive === false ? library.activeScheduleId : nextSchedule.id,
        schedules: [...library.schedules, nextSchedule],
      }
    : {
        version: 1,
        activeScheduleId: nextSchedule.id,
        schedules: [nextSchedule],
      }

  const saved = writeScheduleLibrary(nextLibrary)
  if (!saved) {
    return {
      ok: false,
      schedule: null,
    }
  }

  return {
    ok: true,
    schedule: nextSchedule,
  }
}

export function loadScheduleData() {
  const library = ensureScheduleLibrary()
  if (!library) {
    return null
  }

  const activeSchedule = findActiveSchedule(library)
  return activeSchedule?.scheduleData ?? null
}

export function loadActiveScheduleEntry() {
  const library = ensureScheduleLibrary()
  if (!library) {
    return null
  }

  return findActiveSchedule(library)
}

export function listSavedSchedules() {
  const library = ensureScheduleLibrary()
  if (!library) {
    return []
  }

  return library.schedules.map((schedule) => ({
    id: schedule.id,
    name: schedule.name,
    source: schedule.source,
    themeId: schedule.themeId,
    semesterStartDate: schedule.semesterStartDate,
    createdAt: schedule.createdAt,
    isActive: schedule.id === library.activeScheduleId,
  }))
}

export function switchActiveSchedule(scheduleId: string) {
  const library = ensureScheduleLibrary()
  if (!library) {
    return null
  }

  const target = library.schedules.find((schedule) => schedule.id === scheduleId)
  if (!target) {
    return null
  }

  const nextLibrary: ScheduleLibrary = {
    ...library,
    activeScheduleId: target.id,
  }

  const saved = writeScheduleLibrary(nextLibrary)
  if (!saved) {
    return null
  }

  return target
}

export function clearScheduleData() {
  try {
    localStorage.removeItem(SCHEDULE_STORAGE_KEY)
    localStorage.removeItem(SCHEDULE_LIBRARY_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
