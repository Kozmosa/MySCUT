export type AiProviderId = 'openaiCompatible' | 'builtinGateway' | 'localModel'

export type AiChatMessageRole = 'system' | 'user' | 'assistant'

export type AiChatMessage = {
  role: AiChatMessageRole
  content: string
}

export type ChatCompletionRequest = {
  messages: AiChatMessage[]
  model?: string
  temperature?: number
  signal?: AbortSignal
}

export type ChatCompletionResponse = {
  content: string
  model?: string
  raw: unknown
}

export type OpenAiCompatibleSettings = {
  baseUrl: string
  apiKey: string
  defaultModel?: string
}

export type AiClientErrorCode =
  | 'INVALID_CONFIG'
  | 'NETWORK_ERROR'
  | 'UPSTREAM_ERROR'
  | 'NOT_IMPLEMENTED'

export class AiClientError extends Error {
  readonly code: AiClientErrorCode
  readonly details?: unknown

  constructor(code: AiClientErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AiClientError'
    this.code = code
    this.details = details
  }
}
