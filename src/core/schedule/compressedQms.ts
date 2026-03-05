type ZstdModule = typeof import('@hpcc-js/wasm-zstd')
type ZstdInstance = Awaited<ReturnType<ZstdModule['Zstd']['load']>>

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

let zstdInstancePromise: Promise<ZstdInstance> | null = null

async function getZstdInstance() {
  if (!zstdInstancePromise) {
    zstdInstancePromise = (async () => {
      const zstdModule = await import('@hpcc-js/wasm-zstd')
      return zstdModule.Zstd.load()
    })()
  }

  return zstdInstancePromise
}

function bytesToBase64(bytes: Uint8Array) {
  const chunkSize = 0x8000
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function base64ToBytes(base64: string) {
  const normalized = base64.replace(/\s+/g, '')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export async function encodeCompressedQmsText(qmsText: string) {
  const zstd = await getZstdInstance()
  const rawBytes = textEncoder.encode(qmsText)
  const compressedBytes = zstd.compress(rawBytes)
  return bytesToBase64(compressedBytes)
}

export async function decodeCompressedQmsText(compressedQmsBase64: string) {
  let compressedBytes: Uint8Array

  try {
    compressedBytes = base64ToBytes(compressedQmsBase64)
  } catch {
    throw new Error('压缩QMS解析失败：Base64 编码无效')
  }

  try {
    const zstd = await getZstdInstance()
    const rawBytes = zstd.decompress(compressedBytes)
    return textDecoder.decode(rawBytes)
  } catch {
    throw new Error('压缩QMS解析失败：Zstd 解压失败')
  }
}
