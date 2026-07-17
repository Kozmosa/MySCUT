import { requestLocalModelChatCompletion } from './providers/localModelProvider'
import { requestOpenAiCompatibleChatCompletion } from './providers/openaiCompatibleProvider'
import { getOpenAiCompatibleSettings, getPreferredAiProvider } from './storage'
import { AiClientError, type AiProviderId, type ChatCompletionRequest, type ChatCompletionResponse } from './types'

type ChatCompletionOptions = {
  providerId?: AiProviderId
}

function validateRequest(request: ChatCompletionRequest) {
  if (!Array.isArray(request.messages) || request.messages.length === 0) {
    throw new AiClientError('INVALID_CONFIG', 'chatCompletion 至少需要一条消息')
  }
}

export async function chatCompletion(
  request: ChatCompletionRequest,
  options?: ChatCompletionOptions,
): Promise<ChatCompletionResponse> {
  validateRequest(request)

  const providerId = options?.providerId ?? getPreferredAiProvider()

  if (providerId === 'openaiCompatible') {
    const settings = getOpenAiCompatibleSettings()
    if (!settings) {
      throw new AiClientError('INVALID_CONFIG', '尚未配置 OpenAI 兼容服务，请先设置 Base URL 与 API Key')
    }

    return requestOpenAiCompatibleChatCompletion(request, settings)
  }

  return requestLocalModelChatCompletion(request)
}
