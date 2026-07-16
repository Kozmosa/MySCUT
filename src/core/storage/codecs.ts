import { StorageError, type StorageCodec } from './contracts'

export function createJsonStorageCodec<T>(
  isValid: (value: unknown) => value is T,
  valueName: string,
): StorageCodec<T> {
  return {
    encode(value) {
      try {
        return JSON.stringify(value)
      } catch (error) {
        throw new StorageError('corrupt-data', `${valueName}无法序列化`, error)
      }
    },
    decode(rawValue) {
      try {
        const parsedValue: unknown = JSON.parse(rawValue)
        if (!isValid(parsedValue)) {
          throw new StorageError('corrupt-data', `${valueName}数据格式无效`)
        }

        return parsedValue
      } catch (error) {
        if (error instanceof StorageError) {
          throw error
        }

        throw new StorageError('corrupt-data', `${valueName}数据无法解析`, error)
      }
    },
  }
}
