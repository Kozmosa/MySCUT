import { describe, expect, it } from 'vitest'
import {
  InMemoryPersistentStore,
  InMemoryPreferenceStore,
  InMemorySecretStore,
  StorageError,
  type PersistentKey,
  type PreferenceKey,
  type SecretKey,
  type StorageCodec,
} from '../../../src/core/storage'
import { LocalStoragePersistentStore } from '../../../src/platform/storage/LocalStoragePersistentStore'

const stringCodec: StorageCodec<string> = {
  encode: (value) => value,
  decode: (value) => value,
}

const persistentKey: PersistentKey<string> = {
  namespace: 'test',
  name: 'value',
  schemaVersion: 1,
  codec: stringCodec,
}

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

describe.each([
  ['memory', () => new InMemoryPersistentStore()],
  ['localStorage', () => new LocalStoragePersistentStore(new MemoryStorage())],
] as const)('PersistentStore contract: %s', (_, createStore) => {
  it('supports get, set, atomic update and remove', async () => {
    const store = createStore()

    expect(await store.get(persistentKey)).toBeNull()
    await store.set(persistentKey, 'first')
    expect(await store.get(persistentKey)).toBe('first')

    const updated = await store.update(persistentKey, (currentValue) => `${currentValue}-updated`)
    expect(updated).toBe('first-updated')
    expect(await store.get(persistentKey)).toBe('first-updated')

    await store.remove(persistentKey)
    expect(await store.get(persistentKey)).toBeNull()
  })

  it('serializes concurrent updates', async () => {
    const store = createStore()
    await store.set(persistentKey, '')

    await Promise.all([
      store.update(persistentKey, (value) => `${value}a`),
      store.update(persistentKey, (value) => `${value}b`),
      store.update(persistentKey, (value) => `${value}c`),
    ])

    expect(await store.get(persistentKey)).toBe('abc')
  })
})
describe('typed store fakes', () => {
  it('returns preference defaults and resets stored values', async () => {
    const key: PreferenceKey<string> = {
      namespace: 'preference',
      name: 'theme',
      defaultValue: 'default',
      codec: stringCodec,
    }
    const store = new InMemoryPreferenceStore()

    expect(await store.get(key)).toBe('default')
    await store.set(key, 'custom')
    expect(await store.get(key)).toBe('custom')
    await store.reset(key)
    expect(await store.get(key)).toBe('default')
  })

  it('stores secret values under typed keys', async () => {
    const key: SecretKey = {
      namespace: 'secret',
      name: 'token',
      protection: 'deviceOnly',
    }
    const store = new InMemorySecretStore()

    expect(await store.get(key)).toBeNull()
    await store.set(key, 'value')
    expect(await store.get(key)).toBe('value')
    await store.remove(key)
    expect(await store.get(key)).toBeNull()
  })

  it('rejects records with a mismatched schema version', async () => {
    const storage = new MemoryStorage()
    const store = new LocalStoragePersistentStore(storage)
    await store.set(persistentKey, 'value')

    const incompatibleKey = {
      ...persistentKey,
      schemaVersion: 2,
    }

    await expect(store.get(incompatibleKey)).rejects.toMatchObject<Partial<StorageError>>({
      code: 'corrupt-data',
    })
  })
})
