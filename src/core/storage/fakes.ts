import type {
  PersistentKey,
  PersistentStore,
  PreferenceKey,
  PreferenceStore,
  SecretKey,
  SecretStore,
} from './contracts'
import { StorageError } from './contracts'
import type { PersistentMigrationJournal } from './migrations'

function getKeyId(key: { namespace: string; name: string }) {
  return `${key.namespace}:${key.name}`
}
type PersistentRecord = {
  schemaVersion: number
  value: string
}

export class InMemoryPreferenceStore implements PreferenceStore {
  private readonly values = new Map<string, string>()

  async get<T>(key: PreferenceKey<T>) {
    const rawValue = this.values.get(getKeyId(key))
    return typeof rawValue === 'undefined' ? key.defaultValue : key.codec.decode(rawValue)
  }

  async set<T>(key: PreferenceKey<T>, value: T) {
    this.values.set(getKeyId(key), key.codec.encode(value))
  }

  async reset<T>(key: PreferenceKey<T>) {
    this.values.delete(getKeyId(key))
  }
}

export class InMemoryPersistentStore implements PersistentStore {
  private readonly values = new Map<string, PersistentRecord>()
  private mutationQueue: Promise<void> = Promise.resolve()

  async get<T>(key: PersistentKey<T>) {
    return this.read(key)
  }

  async set<T>(key: PersistentKey<T>, value: T) {
    await this.enqueueMutation(() => {
      this.values.set(getKeyId(key), {
        schemaVersion: key.schemaVersion,
        value: key.codec.encode(value),
      })
    })
  }

  async remove<T>(key: PersistentKey<T>) {
    await this.enqueueMutation(() => {
      this.values.delete(getKeyId(key))
    })
  }

  async update<T>(key: PersistentKey<T>, updater: (currentValue: T | null) => T | null) {
    return this.enqueueMutation(() => {
      const nextValue = updater(this.read(key))
      if (nextValue === null) {
        this.values.delete(getKeyId(key))
        return null
      }

      this.values.set(getKeyId(key), {
        schemaVersion: key.schemaVersion,
        value: key.codec.encode(nextValue),
      })
      return nextValue
    })
  }

  private read<T>(key: PersistentKey<T>) {
    const record = this.values.get(getKeyId(key))
    if (!record) {
      return null
    }

    if (record.schemaVersion !== key.schemaVersion) {
      throw new StorageError('corrupt-data', `持久化数据版本不匹配：${getKeyId(key)}`)
    }

    return key.codec.decode(record.value)
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

export class InMemorySecretStore implements SecretStore {
  private readonly values = new Map<string, string>()

  async get(key: SecretKey) {
    return this.values.get(getKeyId(key)) ?? null
  }

  async set(key: SecretKey, value: string) {
    this.values.set(getKeyId(key), value)
  }

  async remove(key: SecretKey) {
    this.values.delete(getKeyId(key))
  }
}

export class InMemoryMigrationJournal implements PersistentMigrationJournal {
  private readonly completedMigrations = new Set<string>()

  async isCompleted(migrationId: string) {
    return this.completedMigrations.has(migrationId)
  }

  async markCompleted(migrationId: string) {
    this.completedMigrations.add(migrationId)
  }
}
