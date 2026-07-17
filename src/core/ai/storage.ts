import type { AiProviderId, OpenAiCompatibleSettings } from './types'

const AI_PROVIDER_STORAGE_KEY = 'aiProvider'
const OPENAI_COMPATIBLE_SETTINGS_STORAGE_KEY = 'aiOpenAiCompatibleSettings'
const LEGACY_BUILTIN_GATEWAY_PROVIDER_ID = ['builtin', 'Gateway'].join('')

export const OPENAI_API_KEY_LOCAL_ONLY_NOTICE = 'API Key 仅保存在本地，不会上传到应用服务器。'

function isAiProviderId(value: unknown): value is AiProviderId {
  return value === 'openaiCompatible' || value === 'localModel'
}

function normalizeOpenAiCompatibleSettings(value: unknown): OpenAiCompatibleSettings | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const settings = value as {
    baseUrl?: unknown
    apiKey?: unknown
    defaultModel?: unknown
  }

  if (typeof settings.baseUrl !== 'string' || typeof settings.apiKey !== 'string') {
    return null
  }

  if (typeof settings.defaultModel !== 'undefined' && typeof settings.defaultModel !== 'string') {
    return null
  }

  const normalizedBaseUrl = settings.baseUrl.trim()
  const normalizedApiKey = settings.apiKey.trim()
  const normalizedDefaultModel = settings.defaultModel?.trim()

  return {
    baseUrl: normalizedBaseUrl,
    apiKey: normalizedApiKey,
    defaultModel: normalizedDefaultModel || undefined,
  }
}

export function getStoredAiProvider() {
  try {
    const value = localStorage.getItem(AI_PROVIDER_STORAGE_KEY)
    if (value === LEGACY_BUILTIN_GATEWAY_PROVIDER_ID) {
      localStorage.setItem(AI_PROVIDER_STORAGE_KEY, 'localModel')
      return 'localModel'
    }

    return isAiProviderId(value) ? value : null
  } catch {
    return null
  }
}

export function getPreferredAiProvider() {
  return getStoredAiProvider() ?? 'localModel'
}

export function setStoredAiProvider(providerId: AiProviderId) {
  try {
    localStorage.setItem(AI_PROVIDER_STORAGE_KEY, providerId)
    return true
  } catch {
    return false
  }
}

export function getOpenAiCompatibleSettings() {
  try {
    const value = localStorage.getItem(OPENAI_COMPATIBLE_SETTINGS_STORAGE_KEY)
    if (!value) {
      return null
    }

    const parsed: unknown = JSON.parse(value)
    return normalizeOpenAiCompatibleSettings(parsed)
  } catch {
    return null
  }
}

export function setOpenAiCompatibleSettings(settings: OpenAiCompatibleSettings) {
  const normalized = normalizeOpenAiCompatibleSettings(settings)
  if (!normalized) {
    return false
  }

  try {
    localStorage.setItem(OPENAI_COMPATIBLE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
    return true
  } catch {
    return false
  }
}

export function clearOpenAiCompatibleSettings() {
  try {
    localStorage.removeItem(OPENAI_COMPATIBLE_SETTINGS_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
