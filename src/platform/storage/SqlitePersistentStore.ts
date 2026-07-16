import {
  StorageError,
  toStorageError,
  type PersistentKey,
  type PersistentStore,
} from '../../core/storage'
import type { PersistentMigrationJournal } from '../../core/storage'

type SqliteQueryResult = {
  values?: unknown[]
}
export interface PersistentSqliteDatabase {
  execute(statements: string, transaction?: boolean): Promise<unknown>
  query(statement: string, values?: unknown[]): Promise<SqliteQueryResult>
  run(statement: string, values?: unknown[], transaction?: boolean): Promise<unknown>
  beginTransaction(): Promise<unknown>
  commitTransaction(): Promise<unknown>
  rollbackTransaction(): Promise<unknown>
}

type SqliteRecord = {
  schemaVersion: number
  value: string
}

const CREATE_STORAGE_SCHEMA = `
CREATE TABLE IF NOT EXISTS persistent_records (
  namespace TEXT NOT NULL,
  record_key TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (namespace, record_key)
);
CREATE TABLE IF NOT EXISTS storage_migrations (
  migration_id TEXT PRIMARY KEY NOT NULL,
  completed_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO storage_migrations (migration_id, completed_at)
VALUES ('persistent-schema-v1', CAST(strftime('%s', 'now') AS INTEGER) * 1000);
`

export class SqlitePersistentStore implements PersistentStore {
  private mutationQueue: Promise<void> = Promise.resolve()

  constructor(
    private readonly database: PersistentSqliteDatabase,
    private readonly persistCommittedChanges: () => Promise<void> = async () => undefined,
  ) {}

  async initialize() {
    try {
      await this.database.execute(CREATE_STORAGE_SCHEMA, true)
      await this.persistCommittedChanges()
    } catch (error) {
      throw toStorageError(error, 'SQLite 存储初始化失败')
    }
  }

  async get<T>(key: PersistentKey<T>) {
    const record = await this.readRecord(key)
    return record === null ? null : key.codec.decode(record.value)
  }

  async set<T>(key: PersistentKey<T>, value: T) {
    await this.enqueueMutation(async () => {
      await this.runWriteTransaction(async () => {
        await this.writeRecord(key, value)
      })
    })
  }

  async remove<T>(key: PersistentKey<T>) {
    await this.enqueueMutation(async () => {
      await this.runWriteTransaction(async () => {
        await this.database.run(
          'DELETE FROM persistent_records WHERE namespace = ? AND record_key = ?',
          [key.namespace, key.name],
          false,
        )
      })
    })
  }

  async update<T>(key: PersistentKey<T>, updater: (currentValue: T | null) => T | null) {
    return this.enqueueMutation(async () => {
      let nextValue: T | null = null
      await this.runWriteTransaction(async () => {
        const currentRecord = await this.readRecord(key)
        const currentValue = currentRecord === null ? null : key.codec.decode(currentRecord.value)
        nextValue = updater(currentValue)

        if (nextValue === null) {
          await this.database.run(
            'DELETE FROM persistent_records WHERE namespace = ? AND record_key = ?',
            [key.namespace, key.name],
            false,
          )
          return
        }

        await this.writeRecord(key, nextValue)
      })
      return nextValue
    })
  }

  private async readRecord<T>(key: PersistentKey<T>) {
    let result: SqliteQueryResult
    try {
      result = await this.database.query(
        `SELECT schema_version AS schemaVersion, value
         FROM persistent_records
         WHERE namespace = ? AND record_key = ?
         LIMIT 1`,
        [key.namespace, key.name],
      )
    } catch (error) {
      throw toStorageError(error, 'SQLite 数据读取失败')
    }

    const row = result.values?.[0]
    if (typeof row === 'undefined') {
      return null
    }

    if (typeof row !== 'object' || row === null) {
      throw new StorageError('corrupt-data', `SQLite 记录格式无效：${key.namespace}/${key.name}`)
    }

    const candidate = row as Record<string, unknown>
    if (typeof candidate.schemaVersion !== 'number' || typeof candidate.value !== 'string') {
      throw new StorageError('corrupt-data', `SQLite 记录字段无效：${key.namespace}/${key.name}`)
    }

    if (candidate.schemaVersion !== key.schemaVersion) {
      throw new StorageError('corrupt-data', `SQLite 记录版本不匹配：${key.namespace}/${key.name}`)
    }

    return {
      schemaVersion: candidate.schemaVersion,
      value: candidate.value,
    } satisfies SqliteRecord
  }

  private async writeRecord<T>(key: PersistentKey<T>, value: T) {
    await this.database.run(
      `INSERT INTO persistent_records (namespace, record_key, schema_version, value, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(namespace, record_key) DO UPDATE SET
         schema_version = excluded.schema_version,
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [key.namespace, key.name, key.schemaVersion, key.codec.encode(value), Date.now()],
      false,
    )
  }

  private async runWriteTransaction(operation: () => Promise<void>) {
    try {
      await this.database.beginTransaction()
      await operation()
      await this.database.commitTransaction()
    } catch (error) {
      try {
        await this.database.rollbackTransaction()
      } catch {
        // Preserve the original storage error.
      }
      throw toStorageError(error, 'SQLite 数据写入失败')
    }

    try {
      await this.persistCommittedChanges()
    } catch (error) {
      throw toStorageError(error, 'SQLite 数据持久化失败')
    }
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

export class SqliteMigrationJournal implements PersistentMigrationJournal {
  constructor(
    private readonly database: PersistentSqliteDatabase,
    private readonly persistCommittedChanges: () => Promise<void> = async () => undefined,
  ) {}

  async isCompleted(migrationId: string) {
    try {
      const result = await this.database.query(
        'SELECT migration_id FROM storage_migrations WHERE migration_id = ? LIMIT 1',
        [migrationId],
      )
      return typeof result.values?.[0] !== 'undefined'
    } catch (error) {
      throw toStorageError(error, 'SQLite 迁移状态读取失败')
    }
  }

  async markCompleted(migrationId: string) {
    try {
      await this.database.run(
        `INSERT OR IGNORE INTO storage_migrations (migration_id, completed_at)
         VALUES (?, ?)`,
        [migrationId, Date.now()],
        true,
      )
      await this.persistCommittedChanges()
    } catch (error) {
      throw toStorageError(error, 'SQLite 迁移状态写入失败')
    }
  }
}
