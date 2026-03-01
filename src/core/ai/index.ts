export {
  clearOpenAiCompatibleSettings,
  getOpenAiCompatibleSettings,
  getPreferredAiProvider,
  getStoredAiProvider,
  OPENAI_API_KEY_LOCAL_ONLY_NOTICE,
  setOpenAiCompatibleSettings,
  setStoredAiProvider,
} from './storage'
export { chatCompletion } from './client'
export { AiClientError } from './types'
export type {
  AiClientErrorCode,
  AiChatMessage,
  AiChatMessageRole,
  AiProviderId,
  ChatCompletionRequest,
  ChatCompletionResponse,
  OpenAiCompatibleSettings,
} from './types'
