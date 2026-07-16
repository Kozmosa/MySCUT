import {
  StorageError,
  createJsonStorageCodec,
  type PersistentKey,
  type PersistentStorageRuntime,
  type StorageLike,
} from '../storage'
import { resolveScheduleImportThemePreset } from './themePresets'
import type { SavedSchedule, ScheduleData, TimeSlotPresetId } from './types'

const LEGACY_SCHEDULE_STORAGE_KEY = 'scheduleData'
const LEGACY_SCHEDULE_LIBRARY_STORAGE_KEY = 'scheduleLibrary'
const LEGACY_THEME_STORAGE_KEY = 'scheduleThemeId'
const LEGACY_SEMESTER_START_DATE_STORAGE_KEY = 'semesterStartDate'
const LEGACY_DEFAULT_SEMESTER_START_DATE = '2026-02-23'
const SCHEDULE_LIBRARY_MIGRATION_ID = 'schedule-library-v1-from-localstorage'

export type ScheduleLibrary = {
  version: 1
  activeScheduleId: string
  schedules: SavedSchedule[]
}

export type SaveScheduleOptions = {
  themeId: string
  semesterStartDate: string
  timeSlotPresetId?: TimeSlotPresetId
  preferredName?: string
  setActive?: boolean
}

function normalizeTimeSlotPresetId(value: unknown): TimeSlotPresetId {
  if (
    value === 'universityTown' ||
    value === 'wushan' ||
    value === 'international' ||
    value === 'builtIn' ||
    value === 'union'
  ) {
    return value
  }

  return 'builtIn'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isScheduleData(value: unknown): value is ScheduleData {
  if (!isObject(value) || value.version !== 1) {
    return false
  }

  if (value.source !== 'wakeup' && value.source !== 'scutHtml' && value.source !== 'intersection') {
    return false
  }

  return isObject(value.table) && Array.isArray(value.courses) && Array.isArray(value.lessons)
}

function isSavedSchedule(value: unknown): value is SavedSchedule {
  if (!isObject(value)) {
    return false
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.themeId !== 'string' ||
    typeof value.semesterStartDate !== 'string' ||
    typeof value.createdAt !== 'number'
  ) {
    return false
  }

  if (
    typeof value.timeSlotPresetId !== 'undefined' &&
    value.timeSlotPresetId !== 'builtIn' &&
    value.timeSlotPresetId !== 'universityTown' &&
    value.timeSlotPresetId !== 'wushan' &&
    value.timeSlotPresetId !== 'international' &&
    value.timeSlotPresetId !== 'union'
  ) {
    return false
  }

  return isScheduleData(value.scheduleData)
}

function isScheduleLibrary(value: unknown): value is ScheduleLibrary {
  if (!isObject(value)) {
    return false
  }

  return (
    value.version === 1 &&
    typeof value.activeScheduleId === 'string' &&
    Array.isArray(value.schedules) &&
    value.schedules.every(isSavedSchedule)
  )
}

function normalizeScheduleLibrary(library: ScheduleLibrary): ScheduleLibrary {
  return {
    ...library,
    schedules: library.schedules.map((schedule) => ({
      ...schedule,
      timeSlotPresetId: normalizeTimeSlotPresetId(schedule.timeSlotPresetId),
    })),
  }
}

const scheduleLibraryJsonCodec = createJsonStorageCodec(isScheduleLibrary, '课表库')

const scheduleLibraryCodec = {
  encode: scheduleLibraryJsonCodec.encode,
  decode(rawValue: string) {
    return normalizeScheduleLibrary(scheduleLibraryJsonCodec.decode(rawValue))
  },
}

export const SCHEDULE_LIBRARY_KEY: PersistentKey<ScheduleLibrary> = {
  namespace: 'schedule',
  name: 'library',
  schemaVersion: 1,
  codec: scheduleLibraryCodec,
}

function createScheduleId() {
  return `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function findActiveSchedule(library: ScheduleLibrary) {
  return (
    library.schedules.find((schedule) => schedule.id === library.activeScheduleId) ??
    library.schedules[0] ??
    null
  )
}

function buildSavedSchedule(scheduleData: ScheduleData, options: SaveScheduleOptions): SavedSchedule {
  return {
    id: createScheduleId(),
    name: options.preferredName || scheduleData.table.name || '未命名课表',
    source: scheduleData.source,
    themeId: options.themeId,
    timeSlotPresetId: options.timeSlotPresetId ?? 'builtIn',
    semesterStartDate: options.semesterStartDate,
    createdAt: Date.now(),
    scheduleData,
  }
}

function readStorageValue(storage: StorageLike, key: string) {
  try {
    return storage.getItem(key)
  } catch (error) {
    throw new StorageError('unavailable', '旧版课表存储读取失败', error)
  }
}

function readLegacyScheduleLibrary(storage: StorageLike) {
  let foundCorruptData = false
  const rawLibrary = readStorageValue(storage, LEGACY_SCHEDULE_LIBRARY_STORAGE_KEY)

  if (rawLibrary !== null) {
    try {
      return scheduleLibraryCodec.decode(rawLibrary)
    } catch {
      foundCorruptData = true
    }
  }

  const rawScheduleData = readStorageValue(storage, LEGACY_SCHEDULE_STORAGE_KEY)
  if (rawScheduleData !== null) {
    try {
      const parsedScheduleData: unknown = JSON.parse(rawScheduleData)
      if (isScheduleData(parsedScheduleData)) {
        const themeId = resolveScheduleImportThemePreset(
          readStorageValue(storage, LEGACY_THEME_STORAGE_KEY),
        ).id
        const semesterStartDate =
          readStorageValue(storage, LEGACY_SEMESTER_START_DATE_STORAGE_KEY) ||
          LEGACY_DEFAULT_SEMESTER_START_DATE
        const migratedSchedule: SavedSchedule = {
          id: 'legacy-schedule',
          name: parsedScheduleData.table.name || '历史课表',
          source: parsedScheduleData.source,
          themeId,
          timeSlotPresetId: 'builtIn',
          semesterStartDate,
          createdAt: parsedScheduleData.importedAt || Date.now(),
          scheduleData: parsedScheduleData,
        }

        return {
          version: 1,
          activeScheduleId: migratedSchedule.id,
          schedules: [migratedSchedule],
        } satisfies ScheduleLibrary
      }
      foundCorruptData = true
    } catch {
      foundCorruptData = true
    }
  }

  if (foundCorruptData) {
    throw new StorageError('corrupt-data', '旧版课表数据已损坏，已保留原始数据')
  }

  return null
}

function removeLegacyScheduleData(storage: StorageLike) {
  try {
    storage.removeItem(LEGACY_SCHEDULE_STORAGE_KEY)
    storage.removeItem(LEGACY_SCHEDULE_LIBRARY_STORAGE_KEY)
  } catch (error) {
    throw new StorageError('unavailable', '旧版课表数据清理失败', error)
  }
}

function getGlobalLegacyStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export class ScheduleRepository {
  private snapshot: ScheduleLibrary | null = null
  private storageRuntime: PersistentStorageRuntime | null = null
  private initialized = false
  private writable = false
  private readOnlyError: StorageError | null = null
  private mutationQueue: Promise<void> = Promise.resolve()

  async initialize(runtime: PersistentStorageRuntime, legacyStorage: StorageLike | null) {
    this.storageRuntime = runtime
    this.initialized = false
    this.writable = false
    this.readOnlyError = null
    this.mutationQueue = Promise.resolve()

    const persistedLibrary = await runtime.store.get(SCHEDULE_LIBRARY_KEY)
    this.snapshot = persistedLibrary
    const migrationCompleted = await runtime.migrationJournal.isCompleted(SCHEDULE_LIBRARY_MIGRATION_ID)

    if (persistedLibrary !== null && !migrationCompleted) {
      await runtime.migrationJournal.markCompleted(SCHEDULE_LIBRARY_MIGRATION_ID)
      if (legacyStorage !== null) {
        removeLegacyScheduleData(legacyStorage)
      }
    }

    if (persistedLibrary === null && !migrationCompleted) {
      if (legacyStorage === null) {
        throw new StorageError('unavailable', '无法访问旧版课表存储，迁移已暂停')
      }

      const legacyLibrary = readLegacyScheduleLibrary(legacyStorage)
      if (legacyLibrary !== null) {
        await runtime.store.set(SCHEDULE_LIBRARY_KEY, legacyLibrary)
        const verifiedLibrary = await runtime.store.get(SCHEDULE_LIBRARY_KEY)
        if (
          verifiedLibrary === null ||
          scheduleLibraryCodec.encode(verifiedLibrary) !== scheduleLibraryCodec.encode(legacyLibrary)
        ) {
          throw new StorageError('corrupt-data', '课表迁移写入校验失败')
        }

        this.snapshot = verifiedLibrary
        await runtime.migrationJournal.markCompleted(SCHEDULE_LIBRARY_MIGRATION_ID)
        removeLegacyScheduleData(legacyStorage)
      } else {
        await runtime.migrationJournal.markCompleted(SCHEDULE_LIBRARY_MIGRATION_ID)
      }
    }

    this.initialized = true
    this.writable = true
  }

  initializeReadOnly(legacyStorage: StorageLike | null, error: StorageError) {
    if (this.snapshot === null && legacyStorage !== null) {
      try {
        this.snapshot = readLegacyScheduleLibrary(legacyStorage)
      } catch {
        this.snapshot = null
      }
    }

    this.storageRuntime = null
    this.initialized = true
    this.writable = false
    this.readOnlyError = error
    this.mutationQueue = Promise.resolve()
  }

  loadScheduleData() {
    return this.loadActiveScheduleEntry()?.scheduleData ?? null
  }

  loadActiveScheduleEntry() {
    this.assertInitialized()
    return this.snapshot === null ? null : findActiveSchedule(this.snapshot)
  }

  listSavedSchedules() {
    this.assertInitialized()
    if (this.snapshot === null) {
      return []
    }

    return this.snapshot.schedules.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      source: schedule.source,
      themeId: schedule.themeId,
      semesterStartDate: schedule.semesterStartDate,
      createdAt: schedule.createdAt,
      isActive: schedule.id === this.snapshot?.activeScheduleId,
    }))
  }

  loadSavedScheduleById(scheduleId: string) {
    this.assertInitialized()
    return this.snapshot?.schedules.find((schedule) => schedule.id === scheduleId) ?? null
  }

  async saveScheduleDataWithOptions(scheduleData: ScheduleData, options: SaveScheduleOptions) {
    return this.enqueueMutation(async () => {
      const store = this.requireWritableStore()
      const nextSchedule = buildSavedSchedule(scheduleData, options)
      const nextLibrary: ScheduleLibrary = this.snapshot
        ? {
            ...this.snapshot,
            activeScheduleId: options.setActive === false ? this.snapshot.activeScheduleId : nextSchedule.id,
            schedules: [...this.snapshot.schedules, nextSchedule],
          }
        : {
            version: 1,
            activeScheduleId: nextSchedule.id,
            schedules: [nextSchedule],
          }

      await store.set(SCHEDULE_LIBRARY_KEY, nextLibrary)
      this.snapshot = nextLibrary
      return {
        ok: true as const,
        schedule: nextSchedule,
      }
    })
  }

  async setActiveScheduleTimeSlotPreset(timeSlotPresetId: TimeSlotPresetId) {
    return this.enqueueMutation(async () => {
      const store = this.requireWritableStore()
      if (this.snapshot === null) {
        return false
      }

      const nextLibrary: ScheduleLibrary = {
        ...this.snapshot,
        schedules: this.snapshot.schedules.map((schedule) =>
          schedule.id === this.snapshot?.activeScheduleId
            ? { ...schedule, timeSlotPresetId }
            : schedule,
        ),
      }

      await store.set(SCHEDULE_LIBRARY_KEY, nextLibrary)
      this.snapshot = nextLibrary
      return true
    })
  }

  async switchActiveSchedule(scheduleId: string) {
    return this.enqueueMutation(async () => {
      const store = this.requireWritableStore()
      if (this.snapshot === null) {
        return null
      }

      const target = this.snapshot.schedules.find((schedule) => schedule.id === scheduleId)
      if (!target) {
        return null
      }

      const nextLibrary: ScheduleLibrary = {
        ...this.snapshot,
        activeScheduleId: target.id,
      }

      await store.set(SCHEDULE_LIBRARY_KEY, nextLibrary)
      this.snapshot = nextLibrary
      return target
    })
  }

  async deleteSavedSchedule(scheduleId: string) {
    return this.enqueueMutation(async () => {
      const store = this.requireWritableStore()
      if (this.snapshot === null) {
        return {
          ok: false as const,
          nextActiveSchedule: null,
        }
      }

      if (!this.snapshot.schedules.some((schedule) => schedule.id === scheduleId)) {
        return {
          ok: false as const,
          nextActiveSchedule: findActiveSchedule(this.snapshot),
        }
      }

      const nextSchedules = this.snapshot.schedules.filter((schedule) => schedule.id !== scheduleId)
      const nextActiveScheduleId =
        nextSchedules.length === 0
          ? ''
          : this.snapshot.activeScheduleId === scheduleId ||
              !nextSchedules.some((schedule) => schedule.id === this.snapshot?.activeScheduleId)
            ? nextSchedules[0].id
            : this.snapshot.activeScheduleId
      const nextLibrary: ScheduleLibrary = {
        ...this.snapshot,
        activeScheduleId: nextActiveScheduleId,
        schedules: nextSchedules,
      }

      await store.set(SCHEDULE_LIBRARY_KEY, nextLibrary)
      this.snapshot = nextLibrary
      return {
        ok: true as const,
        nextActiveSchedule: findActiveSchedule(nextLibrary),
      }
    })
  }

  async clearScheduleData() {
    return this.enqueueMutation(async () => {
      const store = this.requireWritableStore()
      await store.remove(SCHEDULE_LIBRARY_KEY)
      this.snapshot = null
      return true
    })
  }

  private assertInitialized() {
    if (!this.initialized) {
      throw new StorageError('unavailable', '课表存储尚未初始化')
    }
  }

  private requireWritableStore() {
    this.assertInitialized()
    if (!this.writable || this.storageRuntime === null) {
      throw this.readOnlyError ?? new StorageError('unavailable', '课表存储当前为只读状态')
    }

    return this.storageRuntime.store
  }

  private enqueueMutation<T>(operation: () => T | Promise<T>) {
    const nextOperation = this.mutationQueue.then(operation, operation)
    this.mutationQueue = nextOperation.then(
      () => undefined,
      () => undefined,
    )
    return nextOperation
  }
}

const scheduleRepository = new ScheduleRepository()

export async function initializeScheduleStorage(
  runtime: PersistentStorageRuntime,
  legacyStorage: StorageLike | null,
) {
  await scheduleRepository.initialize(runtime, legacyStorage)
}

export function initializeScheduleStorageReadOnly(
  legacyStorage: StorageLike | null,
  error: StorageError,
) {
  scheduleRepository.initializeReadOnly(legacyStorage, error)
}

export async function saveScheduleData(scheduleData: ScheduleData) {
  const legacyStorage = getGlobalLegacyStorage()
  let storedThemeId: string | null = null
  let storedSemesterStartDate: string | null = null
  try {
    storedThemeId = legacyStorage?.getItem(LEGACY_THEME_STORAGE_KEY) ?? null
    storedSemesterStartDate = legacyStorage?.getItem(LEGACY_SEMESTER_START_DATE_STORAGE_KEY) ?? null
  } catch {
    storedThemeId = null
    storedSemesterStartDate = null
  }

  const themeId = resolveScheduleImportThemePreset(storedThemeId).id
  const semesterStartDate = storedSemesterStartDate || LEGACY_DEFAULT_SEMESTER_START_DATE

  return scheduleRepository.saveScheduleDataWithOptions(scheduleData, {
    themeId,
    semesterStartDate,
    timeSlotPresetId: 'builtIn',
    preferredName: scheduleData.table.name,
    setActive: true,
  })
}

export function setActiveScheduleTimeSlotPreset(timeSlotPresetId: TimeSlotPresetId) {
  return scheduleRepository.setActiveScheduleTimeSlotPreset(timeSlotPresetId)
}

export function saveScheduleDataWithOptions(scheduleData: ScheduleData, options: SaveScheduleOptions) {
  return scheduleRepository.saveScheduleDataWithOptions(scheduleData, options)
}

export function loadScheduleData() {
  return scheduleRepository.loadScheduleData()
}

export function loadActiveScheduleEntry() {
  return scheduleRepository.loadActiveScheduleEntry()
}

export function listSavedSchedules() {
  return scheduleRepository.listSavedSchedules()
}

export function loadSavedScheduleById(scheduleId: string) {
  return scheduleRepository.loadSavedScheduleById(scheduleId)
}

export function switchActiveSchedule(scheduleId: string) {
  return scheduleRepository.switchActiveSchedule(scheduleId)
}

export function deleteSavedSchedule(scheduleId: string) {
  return scheduleRepository.deleteSavedSchedule(scheduleId)
}

export function clearScheduleData() {
  return scheduleRepository.clearScheduleData()
}
