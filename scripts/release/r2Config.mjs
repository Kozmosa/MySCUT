import { existsSync, readFileSync } from 'node:fs'
import { r2EnvFilePath } from './constants.mjs'

const REQUIRED_R2_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PUBLIC_BASE_URL',
]

function parseEnvFile(content) {
  const envMap = {}
  const lines = content.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    if (!key) {
      continue
    }

    envMap[key] = value
  }

  return envMap
}

function loadR2EnvMap() {
  if (!existsSync(r2EnvFilePath)) {
    return {}
  }

  const content = readFileSync(r2EnvFilePath, 'utf8')
  return parseEnvFile(content)
}

function readRequiredValue(key, envMap) {
  const preferred = typeof envMap[key] === 'string' ? envMap[key].trim() : ''
  if (preferred) {
    return preferred
  }

  const fallback = typeof process.env[key] === 'string' ? process.env[key].trim() : ''
  if (fallback) {
    return fallback
  }

  throw new Error(`Missing required R2 config: ${key}`)
}

function readOptionalValue(key, envMap, defaultValue = '') {
  const preferred = typeof envMap[key] === 'string' ? envMap[key].trim() : ''
  if (preferred) {
    return preferred
  }

  const fallback = typeof process.env[key] === 'string' ? process.env[key].trim() : ''
  if (fallback) {
    return fallback
  }

  return defaultValue
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '')
}

export function loadR2Config() {
  const envMap = loadR2EnvMap()
  for (const key of REQUIRED_R2_KEYS) {
    readRequiredValue(key, envMap)
  }

  const accountId = readRequiredValue('R2_ACCOUNT_ID', envMap)
  const bucket = readRequiredValue('R2_BUCKET', envMap)
  const accessKeyId = readRequiredValue('R2_ACCESS_KEY_ID', envMap)
  const secretAccessKey = readRequiredValue('R2_SECRET_ACCESS_KEY', envMap)
  const publicBaseUrl = normalizeBaseUrl(readRequiredValue('R2_PUBLIC_BASE_URL', envMap))
  const keyPrefix = readOptionalValue('R2_KEY_PREFIX', envMap, 'releases')
  const endpoint = readOptionalValue('R2_S3_ENDPOINT', envMap, `https://${accountId}.r2.cloudflarestorage.com`)

  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    keyPrefix,
    endpoint,
  }
}
