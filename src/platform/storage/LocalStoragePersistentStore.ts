import {
  StorageError,
  toStorageError,
  type PersistentKey,
  type PersistentStore,
  type StorageLike,
} from '../../core/storage'
import type { PersistentMigrationJournal } from '../../core/storage'

type LocalStorageRecord = {
  schemaVersion: number
  value: string
  updatedAt: number
}
function isLocalStorageRecord(value: unknown): value is LocalStorageRecord {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.schemaVersion === 'number' &&
    typeof candidate.value === 'string' &&
    typeof candidate.updatedAt === 'number'
  )
}

export class LocalStoragePersistentStore implements PersistentStore {
  private mutationQueue: Promise<void> = Promise.resolve()

  constructor(
    private readonly storage: StorageLike,
    private readonly prefix = 'myscut:persistent:',
  ) {}

  async get<T>(key: PersistentKey<T>) {
    return this.read(key)
  }

  async set<T>(key: PersistentKey<T>, value: T) {
    await this.enqueueMutation(() => {
      this.write(key, value)
    })
  }

  async remove<T>(key: PersistentKey<T>) {
    await this.enqueueMutation(() => {
      try {
        this.storage.removeItem(this.getStorageKey(key))
      } catch (error) {
        throw toStorageError(error, '持久化数据删除失败')
      }
    })
  }

  async update<T>(key: PersistentKey<T>, updater: (currentValue: T | null) => T | null) {
    return this.enqueueMutation(() => {
      const nextValue = updater(this.read(key))
      if (nextValue === null) {
        try {
          this.storage.removeItem(this.getStorageKey(key))
        } catch (error) {
          throw toStorageError(error, '持久化数据删除失败')
        }
        return null
      }

      this.write(key, nextValue)
      return nextValue
    })
  }

  private read<T>(key: PersistentKey<T>) {
    let rawRecord: string | null
    try {
      rawRecord = this.storage.getItem(this.getStorageKey(key))
    } catch (error) {
      throw toStorageError(error, '持久化数据读取失败')
    }

    if (rawRecord === null) {
      return null
    }

    try {
      const parsedRecord: unknown = JSON.parse(rawRecord)
      if (!isLocalStorageRecord(parsedRecord)) {
        throw new StorageError('corrupt-data', `持久化记录格式无效：${key.namespace}/${key.name}`)
      }

      if (parsedRecord.schemaVersion !== key.schemaVersion) {
        throw new StorageError('corrupt-data', `持久化记录版本不匹配：${key.namespace}/${key.name}`)
      }

      return key.codec.decode(parsedRecord.value)
    } catch (error) {
      if (error instanceof StorageError) {
        throw error
      }

      throw new StorageError('corrupt-data', `持久化记录无法解析：${key.namespace}/${key.name}`, error)
    }
  }

  private write<T>(key: PersistentKey<T>, value: T) {
    const record: LocalStorageRecord = {
      schemaVersion: key.schemaVersion,
      value: key.codec.encode(value),
      updatedAt: Date.now(),
    }

    try {
      this.storage.setItem(this.getStorageKey(key), JSON.stringify(record))
    } catch (error) {
      throw toStorageError(error, '持久化数据写入失败')
    }
  }

  private getStorageKey(key: { namespace: string; name: string }) {
    return `${this.prefix}${encodeURIComponent(key.namespace)}:${encodeURIComponent(key.name)}`
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

export class LocalStorageMigrationJournal implements PersistentMigrationJournal {
  constructor(
    private readonly storage: StorageLike,
    private readonly prefix = 'myscut:persistent:migration:',
  ) {}

  async isCompleted(migrationId: string) {
    try {
      return this.storage.getItem(`${this.prefix}${encodeURIComponent(migrationId)}`) === '1'
    } catch (error) {
      throw toStorageError(error, '迁移状态读取失败')
    }
  }

  async markCompleted(migrationId: string) {
    try {
      this.storage.setItem(`${this.prefix}${encodeURIComponent(migrationId)}`, '1')
    } catch (error) {
      throw toStorageError(error, '迁移状态写入失败')
    }
  }
}
