import { afterEach, beforeEach } from 'vitest'

type MockStorageShape = {
  clear(): void
  getItem(key: string): string | null
  key(index: number): string | null
  removeItem(key: string): void
  setItem(key: string, value: string): void
  readonly length: number
}

function createInMemoryStorage(): Storage {
  const entries = new Map<string, string>()

  return {
    clear() {
      entries.clear()
    },
    getItem(key) {
      const value = entries.get(key)
      return typeof value === 'undefined' ? null : value
    },
    setItem(key, value) {
      entries.set(key, String(value))
    },
    removeItem(key) {
      entries.delete(key)
    },
    key(index) {
      return [...entries.keys()][index] ?? null
    },
    get length() {
      return entries.size
    },
  } as Storage
}

function ensureLocalStorageAvailable() {
  const fallbackStorage = createInMemoryStorage()

  if (typeof globalThis.localStorage === 'undefined') {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: fallbackStorage,
    })
  }

  if (typeof globalThis.window !== 'undefined' && typeof globalThis.window.localStorage === 'undefined') {
    Object.defineProperty(globalThis.window, 'localStorage', {
      configurable: true,
      value: fallbackStorage,
    })
  }
}

beforeEach(() => {
  ensureLocalStorageAvailable()
})

afterEach(() => {
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.clear()
  }
})
