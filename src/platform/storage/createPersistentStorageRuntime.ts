import { toStorageError, type PersistentStorageRuntime, type StorageLike } from '../../core/storage'
import { LocalStorageMigrationJournal, LocalStoragePersistentStore } from './LocalStoragePersistentStore'
import { SqliteMigrationJournal, SqlitePersistentStore } from './SqlitePersistentStore'

const DATABASE_NAME = 'myscut'
const DATABASE_VERSION = 1

let sqliteRuntimePromise: Promise<PersistentStorageRuntime> | null = null

function getBrowserStorage(): StorageLike {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw toStorageError(new Error('localStorage unavailable'), '本地持久化存储不可用')
  }

  return window.localStorage
}

async function createSqliteRuntime(): Promise<PersistentStorageRuntime> {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite')
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  const isWeb = (import.meta.env.VITE_TARGET_PLATFORM || 'web') === 'web'

  if (isWeb) {
    const { defineCustomElements } = await import('jeep-sqlite/loader')
    defineCustomElements(window)

    let sqliteElement = document.querySelector('jeep-sqlite') as (HTMLElement & {
      autoSave: boolean
      wasmPath: string
    }) | null

    if (!sqliteElement) {
      sqliteElement = document.createElement('jeep-sqlite') as HTMLElement & {
        autoSave: boolean
        wasmPath: string
      }
      sqliteElement.autoSave = false
      sqliteElement.wasmPath = `${import.meta.env.BASE_URL}assets`
      document.body.append(sqliteElement)
    }

    await customElements.whenDefined('jeep-sqlite')
    await sqlite.initWebStore()
  }

  const consistency = await sqlite.checkConnectionsConsistency()
  if (!consistency.result) {
    await sqlite.closeAllConnections()
  }

  const existingConnection = await sqlite.isConnection(DATABASE_NAME, false)
  const database = existingConnection.result
    ? await sqlite.retrieveConnection(DATABASE_NAME, false)
    : await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', DATABASE_VERSION, false)

  const isOpen = await database.isDBOpen()
  if (!isOpen.result) {
    await database.open()
  }

  const persistCommittedChanges = isWeb
    ? () => sqlite.saveToStore(DATABASE_NAME)
    : async () => undefined

  const store = new SqlitePersistentStore(database, persistCommittedChanges)
  await store.initialize()

  return {
    store,
    migrationJournal: new SqliteMigrationJournal(database, persistCommittedChanges),
  }
}

export async function createPersistentStorageRuntime(): Promise<PersistentStorageRuntime> {
  if (import.meta.env.VITE_TARGET_PLATFORM === 'ohos') {
    const storage = getBrowserStorage()
    return {
      store: new LocalStoragePersistentStore(storage),
      migrationJournal: new LocalStorageMigrationJournal(storage),
    }
  }

  if (!sqliteRuntimePromise) {
    sqliteRuntimePromise = createSqliteRuntime()
  }

  try {
    return await sqliteRuntimePromise
  } catch (error) {
    sqliteRuntimePromise = null
    throw toStorageError(error, '课表数据库初始化失败')
  }
}
