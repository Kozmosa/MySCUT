import { existsSync, readFileSync, writeFileSync } from 'node:fs'
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

function readEnvValue(key) {
  return typeof process.env[key] === 'string' ? process.env[key].trim() : ''
}

function hasAnyRequiredEnvValue() {
  for (const key of REQUIRED_R2_KEYS) {
    if (readEnvValue(key)) {
      return true
    }
  }

  return false
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

async function askNonEmpty(askText, prompt) {
  while (true) {
    const value = await askText(prompt)
    if (value.trim()) {
      return value.trim()
    }

    console.log('This field is required. Please input a non-empty value.')
  }
}

async function askHiddenNonEmpty(askHidden, prompt) {
  while (true) {
    const value = await askHidden(prompt)
    if (value.trim()) {
      return value.trim()
    }

    console.log('This field is required. Please input a non-empty value.')
  }
}

export function shouldBootstrapR2EnvFile() {
  return !existsSync(r2EnvFilePath) && !hasAnyRequiredEnvValue()
}

export async function bootstrapR2EnvFile({ askText, askHidden }) {
  console.log('R2_ENV is missing and no required R2 env vars were found.')
  console.log('Please input Cloudflare R2 settings. A local R2_ENV file will be created.')

  const accountId = await askNonEmpty(askText, 'R2_ACCOUNT_ID: ')
  const bucket = await askNonEmpty(askText, 'R2_BUCKET: ')
  const accessKeyId = await askNonEmpty(askText, 'R2_ACCESS_KEY_ID: ')
  const secretAccessKey = await askHiddenNonEmpty(askHidden, 'R2_SECRET_ACCESS_KEY (hidden): ')
  const publicBaseUrl = normalizeBaseUrl(await askNonEmpty(askText, 'R2_PUBLIC_BASE_URL: '))

  const keyPrefixInput = await askText('R2_KEY_PREFIX (optional, default releases): ')
  const keyPrefix = keyPrefixInput.trim() || 'releases'
  const defaultEndpoint = `https://${accountId}.r2.cloudflarestorage.com`
  const endpointInput = await askText(`R2_S3_ENDPOINT (optional, default ${defaultEndpoint}): `)
  const endpoint = endpointInput.trim() || defaultEndpoint

  const contentLines = [
    '# Cloudflare R2 release config',
    `R2_ACCOUNT_ID=${accountId}`,
    `R2_BUCKET=${bucket}`,
    `R2_ACCESS_KEY_ID=${accessKeyId}`,
    `R2_SECRET_ACCESS_KEY=${secretAccessKey}`,
    `R2_PUBLIC_BASE_URL=${publicBaseUrl}`,
    `R2_KEY_PREFIX=${keyPrefix}`,
    `R2_S3_ENDPOINT=${endpoint}`,
    '',
  ]

  writeFileSync(r2EnvFilePath, contentLines.join('\n'))
  console.log(`Saved R2 config to ${r2EnvFilePath}`)
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
