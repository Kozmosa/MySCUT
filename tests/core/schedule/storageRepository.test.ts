import { describe, expect, it } from 'vitest'
import {
  InMemoryMigrationJournal,
  InMemoryPersistentStore,
  StorageError,
  type PersistentKey,
  type PersistentStore,
} from '../../../src/core/storage'
import {
  SCHEDULE_LIBRARY_KEY,
  ScheduleRepository,
  type ScheduleLibrary,
} from '../../../src/core/schedule/storage'
import type { ScheduleData } from '../../../src/core/schedule/types'

class MemoryStorage {
  readonly values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

class FailingPersistentStore implements PersistentStore {
  failWrites = false

  constructor(private readonly target: PersistentStore) {}

  get<T>(key: PersistentKey<T>) {
    return this.target.get(key)
  }

  async set<T>(key: PersistentKey<T>, value: T) {
    if (this.failWrites) {
      throw new StorageError('unavailable', 'forced failure')
    }
    await this.target.set(key, value)
  }

  remove<T>(key: PersistentKey<T>) {
    return this.target.remove(key)
  }

  update<T>(key: PersistentKey<T>, updater: (currentValue: T | null) => T | null) {
    return this.target.update(key, updater)
  }
}

class DroppingPersistentStore implements PersistentStore {
  async get<T>(_key: PersistentKey<T>) {
    return null
  }

  async set<T>(_key: PersistentKey<T>, _value: T) {}

  async remove<T>(_key: PersistentKey<T>) {}

  async update<T>(_key: PersistentKey<T>, updater: (currentValue: T | null) => T | null) {
    return updater(null)
  }
}

function createScheduleData(name = '测试课表'): ScheduleData {
  return {
    version: 1,
    source: 'scutHtml',
    importedAt: 100,
    table: {
      id: 1,
      name,
      campus: '五山校区',
      school: '华南理工大学',
      maxWeek: 18,
      nodes: 12,
      startDate: '2026-02-23',
      showSat: true,
      showSun: true,
      timeTable: 1,
    },
    timeSlots: [],
    courses: [],
    lessons: [],
    raw: {
      kind: 'scutHtml',
      html: '<html></html>',
    },
  }
}

function createLibrary(scheduleData = createScheduleData()): ScheduleLibrary {
  return {
    version: 1,
    activeScheduleId: 'saved-schedule',
    schedules: [
      {
        id: 'saved-schedule',
        name: scheduleData.table.name,
        source: scheduleData.source,
        themeId: 'palacePlum',
        timeSlotPresetId: 'builtIn',
        semesterStartDate: '2026-02-23',
        createdAt: 100,
        scheduleData,
      },
    ],
  }
}

describe('ScheduleRepository migration', () => {
  it('migrates and verifies the legacy schedule library before deleting schedule keys', async () => {
    const legacyStorage = new MemoryStorage()
    const library = createLibrary()
    legacyStorage.setItem('scheduleLibrary', JSON.stringify(library))
    legacyStorage.setItem('scheduleThemeId', 'autumnOsmanthus')
    legacyStorage.setItem('semesterStartDate', '2026-03-02')
    const persistentStore = new InMemoryPersistentStore()
    const migrationJournal = new InMemoryMigrationJournal()
    const repository = new ScheduleRepository()

    await repository.initialize({ store: persistentStore, migrationJournal }, legacyStorage)

    expect(repository.loadActiveScheduleEntry()?.name).toBe('测试课表')
    expect(await persistentStore.get(SCHEDULE_LIBRARY_KEY)).toEqual(library)
    expect(legacyStorage.getItem('scheduleLibrary')).toBeNull()
    expect(legacyStorage.getItem('scheduleThemeId')).toBe('autumnOsmanthus')
    expect(legacyStorage.getItem('semesterStartDate')).toBe('2026-03-02')
  })

  it('migrates legacy scheduleData with the selected preset and remains idempotent', async () => {
    const legacyStorage = new MemoryStorage()
    legacyStorage.setItem('scheduleData', JSON.stringify(createScheduleData('旧课表')))
    legacyStorage.setItem('scheduleThemeId', 'bambooGrove')
    legacyStorage.setItem('semesterStartDate', '2026-03-09')
    const persistentStore = new InMemoryPersistentStore()
    const migrationJournal = new InMemoryMigrationJournal()

    const firstRepository = new ScheduleRepository()
    await firstRepository.initialize({ store: persistentStore, migrationJournal }, legacyStorage)
    expect(firstRepository.loadActiveScheduleEntry()).toMatchObject({
      name: '旧课表',
      themeId: 'bambooGrove',
      semesterStartDate: '2026-03-09',
    })

    legacyStorage.setItem('scheduleData', JSON.stringify(createScheduleData('不应覆盖')))
    const secondRepository = new ScheduleRepository()
    await secondRepository.initialize({ store: persistentStore, migrationJournal }, legacyStorage)
    expect(secondRepository.loadActiveScheduleEntry()?.name).toBe('旧课表')
  })

  it('preserves corrupt legacy data and reports a corrupt-data error', async () => {
    const legacyStorage = new MemoryStorage()
    legacyStorage.setItem('scheduleLibrary', '{bad json')
    const repository = new ScheduleRepository()

    await expect(repository.initialize({
      store: new InMemoryPersistentStore(),
      migrationJournal: new InMemoryMigrationJournal(),
    }, legacyStorage)).rejects.toMatchObject({ code: 'corrupt-data' })
    expect(legacyStorage.getItem('scheduleLibrary')).toBe('{bad json')
  })

  it('keeps legacy keys when the persistent write cannot be verified', async () => {
    const legacyStorage = new MemoryStorage()
    legacyStorage.setItem('scheduleLibrary', JSON.stringify(createLibrary()))
    const repository = new ScheduleRepository()

    await expect(repository.initialize({
      store: new DroppingPersistentStore(),
      migrationJournal: new InMemoryMigrationJournal(),
    }, legacyStorage)).rejects.toMatchObject({ code: 'corrupt-data' })
    expect(legacyStorage.getItem('scheduleLibrary')).not.toBeNull()
  })
})

describe('ScheduleRepository durable snapshots', () => {
  it('does not change its snapshot when a durable write fails', async () => {
    const targetStore = new InMemoryPersistentStore()
    const store = new FailingPersistentStore(targetStore)
    const repository = new ScheduleRepository()
    await repository.initialize({
      store,
      migrationJournal: new InMemoryMigrationJournal(),
    }, new MemoryStorage())

    await repository.saveScheduleDataWithOptions(createScheduleData('第一份'), {
      themeId: 'skyBlue',
      semesterStartDate: '2026-02-23',
    })
    store.failWrites = true

    await expect(repository.saveScheduleDataWithOptions(createScheduleData('第二份'), {
      themeId: 'skyBlue',
      semesterStartDate: '2026-02-23',
    })).rejects.toMatchObject({ code: 'unavailable' })

    expect(repository.listSavedSchedules().map((schedule) => schedule.name)).toEqual(['第一份'])
    expect((await targetStore.get(SCHEDULE_LIBRARY_KEY))?.schedules).toHaveLength(1)
  })

  it('blocks mutations in read-only mode while retaining a readable legacy snapshot', async () => {
    const legacyStorage = new MemoryStorage()
    legacyStorage.setItem('scheduleLibrary', JSON.stringify(createLibrary()))
    const repository = new ScheduleRepository()
    repository.initializeReadOnly(
      legacyStorage,
      new StorageError('unavailable', 'database unavailable'),
    )

    expect(repository.loadActiveScheduleEntry()?.name).toBe('测试课表')
    await expect(repository.clearScheduleData()).rejects.toMatchObject({ code: 'unavailable' })
    expect(repository.loadActiveScheduleEntry()?.name).toBe('测试课表')
  })
})
