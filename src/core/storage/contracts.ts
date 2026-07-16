export type StorageErrorCode =
  | 'unavailable'
  | 'permission-denied'
  | 'quota-exceeded'
  | 'corrupt-data'
  | 'unsupported'

export class StorageError extends Error {
  readonly code: StorageErrorCode
  readonly cause?: unknown

  constructor(code: StorageErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'StorageError'
    this.code = code
    this.cause = cause
  }
}
export function toStorageError(error: unknown, fallbackMessage: string) {
  if (error instanceof StorageError) {
    return error
  }

  const message = error instanceof Error ? error.message : String(error)
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('quota') || normalizedMessage.includes('disk is full')) {
    return new StorageError('quota-exceeded', fallbackMessage, error)
  }

  if (
    normalizedMessage.includes('permission') ||
    normalizedMessage.includes('denied') ||
    normalizedMessage.includes('not allowed')
  ) {
    return new StorageError('permission-denied', fallbackMessage, error)
  }

  if (normalizedMessage.includes('not implemented') || normalizedMessage.includes('unsupported')) {
    return new StorageError('unsupported', fallbackMessage, error)
  }

  return new StorageError('unavailable', fallbackMessage, error)
}

export interface StorageCodec<T> {
  encode(value: T): string
  decode(rawValue: string): T
}

type StorageKey<T> = {
  readonly namespace: string
  readonly name: string
  readonly codec: StorageCodec<T>
}

export type PreferenceKey<T> = StorageKey<T> & {
  readonly defaultValue: T
}

export type PersistentKey<T> = StorageKey<T> & {
  readonly schemaVersion: number
}

export type SecretProtection = 'deviceOnly' | 'userPresenceRequired'

export type SecretKey = {
  readonly namespace: string
  readonly name: string
  readonly protection: SecretProtection
}

export interface PreferenceStore {
  get<T>(key: PreferenceKey<T>): Promise<T>
  set<T>(key: PreferenceKey<T>, value: T): Promise<void>
  reset<T>(key: PreferenceKey<T>): Promise<void>
}

export interface PersistentStore {
  get<T>(key: PersistentKey<T>): Promise<T | null>
  set<T>(key: PersistentKey<T>, value: T): Promise<void>
  remove<T>(key: PersistentKey<T>): Promise<void>
  update<T>(
    key: PersistentKey<T>,
    updater: (currentValue: T | null) => T | null,
  ): Promise<T | null>
}

export interface SecretStore {
  get(key: SecretKey): Promise<string | null>
  set(key: SecretKey, value: string): Promise<void>
  remove(key: SecretKey): Promise<void>
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
