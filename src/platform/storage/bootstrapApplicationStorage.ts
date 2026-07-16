import {
  StorageError,
  toStorageError,
  type StorageLike,
} from '../../core/storage'
import {
  initializeScheduleStorage,
  initializeScheduleStorageReadOnly,
} from '../../core/schedule/storage'
import { createPersistentStorageRuntime } from './createPersistentStorageRuntime'

export type ApplicationStorageRuntime =
  | {
      status: 'ready'
      error: null
    }
  | {
      status: 'readOnly'
      error: StorageError
    }

function getLegacyStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
export async function bootstrapApplicationStorage(): Promise<ApplicationStorageRuntime> {
  const legacyStorage = getLegacyStorage()

  try {
    const runtime = await createPersistentStorageRuntime()
    await initializeScheduleStorage(runtime, legacyStorage)
    return {
      status: 'ready',
      error: null,
    }
  } catch (error) {
    const storageError = toStorageError(error, '课表持久化存储初始化失败')
    initializeScheduleStorageReadOnly(legacyStorage, storageError)
    return {
      status: 'readOnly',
      error: storageError,
    }
  }
}
