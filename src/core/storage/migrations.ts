export interface PersistentMigrationJournal {
  isCompleted(migrationId: string): Promise<boolean>
  markCompleted(migrationId: string): Promise<void>
}
export type PersistentStorageRuntime = {
  store: import('./contracts').PersistentStore
  migrationJournal: PersistentMigrationJournal
}
