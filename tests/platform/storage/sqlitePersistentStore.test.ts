import { describe, expect, it } from 'vitest'
import type { PersistentKey, StorageCodec } from '../../../src/core/storage'
import {
  SqliteMigrationJournal,
  SqlitePersistentStore,
  type PersistentSqliteDatabase,
} from '../../../src/platform/storage/SqlitePersistentStore'

type StoredRecord = {
  schemaVersion: number
  value: string
}

class FakeSqliteDatabase implements PersistentSqliteDatabase {
  readonly records = new Map<string, StoredRecord>()
  readonly migrations = new Set<string>()
  executedSchema = ''
  failNextRun = false
  private transactionSnapshot: Map<string, StoredRecord> | null = null

  async execute(statements: string) {
    this.executedSchema = statements
  }

  async query(statement: string, values: unknown[] = []) {
    if (statement.includes('FROM persistent_records')) {
      const record = this.records.get(`${values[0]}:${values[1]}`)
      return {
        values: record ? [{ ...record }] : [],
      }
    }

    if (statement.includes('FROM storage_migrations')) {
      return {
        values: this.migrations.has(String(values[0])) ? [{ migration_id: values[0] }] : [],
      }
    }

    return { values: [] }
  }

  async run(statement: string, values: unknown[] = []) {
    if (this.failNextRun) {
      this.failNextRun = false
      throw new Error('write failed')
    }

    if (statement.includes('INSERT INTO persistent_records')) {
      this.records.set(`${values[0]}:${values[1]}`, {
        schemaVersion: Number(values[2]),
        value: String(values[3]),
      })
    } else if (statement.includes('DELETE FROM persistent_records')) {
      this.records.delete(`${values[0]}:${values[1]}`)
    } else if (statement.includes('INSERT OR IGNORE INTO storage_migrations')) {
      this.migrations.add(String(values[0]))
    }
  }

  async beginTransaction() {
    this.transactionSnapshot = new Map(this.records)
  }

  async commitTransaction() {
    this.transactionSnapshot = null
  }

  async rollbackTransaction() {
    if (this.transactionSnapshot) {
      this.records.clear()
      this.transactionSnapshot.forEach((value, key) => this.records.set(key, value))
      this.transactionSnapshot = null
    }
  }
}

const numberCodec: StorageCodec<number> = {
  encode: String,
  decode: Number,
}

const key: PersistentKey<number> = {
  namespace: 'test',
  name: 'counter',
  schemaVersion: 1,
  codec: numberCodec,
}

describe('SqlitePersistentStore', () => {
  it('creates the generic schema and persists committed changes', async () => {
    const database = new FakeSqliteDatabase()
    let persistCount = 0
    const store = new SqlitePersistentStore(database, async () => {
      persistCount += 1
    })

    await store.initialize()
    expect(database.executedSchema).toContain('persistent_records')
    expect(database.executedSchema).toContain('storage_migrations')

    await store.set(key, 1)
    await store.update(key, (value) => (value ?? 0) + 1)
    expect(await store.get(key)).toBe(2)
    expect(persistCount).toBe(3)

    await store.remove(key)
    expect(await store.get(key)).toBeNull()
  })

  it('rolls back a failed write', async () => {
    const database = new FakeSqliteDatabase()
    const store = new SqlitePersistentStore(database)
    await store.initialize()
    await store.set(key, 1)
    database.failNextRun = true

    await expect(store.set(key, 2)).rejects.toMatchObject({ code: 'unavailable' })
    expect(await store.get(key)).toBe(1)
  })

  it('records completed migrations', async () => {
    const database = new FakeSqliteDatabase()
    const store = new SqlitePersistentStore(database)
    await store.initialize()
    const journal = new SqliteMigrationJournal(database)

    expect(await journal.isCompleted('schedule-v1')).toBe(false)
    await journal.markCompleted('schedule-v1')
    expect(await journal.isCompleted('schedule-v1')).toBe(true)
  })
})
