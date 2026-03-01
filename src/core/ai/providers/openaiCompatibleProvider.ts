import { AiClientError, type ChatCompletionRequest, type ChatCompletionResponse, type OpenAiCompatibleSettings } from '../types'

type OpenAiChatResponse = {
  model?: unknown
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function resolveMessageContent(content: unknown): string | null {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return null
  }

  const texts = content
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return ''
      }

      const typedItem = item as { type?: unknown; text?: unknown }
      if (typedItem.type !== 'text' || typeof typedItem.text !== 'string') {
        return ''
      }

      return typedItem.text
    })
    .filter((item) => item)

  return texts.length > 0 ? texts.join('\n') : null
}

function buildRequestBody(request: ChatCompletionRequest, model: string) {
  const body: {
    model: string
    messages: ChatCompletionRequest['messages']
    temperature?: number
  } = {
    model,
    messages: request.messages,
  }

  if (typeof request.temperature === 'number') {
    body.temperature = request.temperature
  }

  return body
}

export async function requestOpenAiCompatibleChatCompletion(
  request: ChatCompletionRequest,
  settings: OpenAiCompatibleSettings,
): Promise<ChatCompletionResponse> {
  if (!settings.baseUrl || !settings.apiKey) {
    throw new AiClientError('INVALID_CONFIG', 'OpenAI 兼容服务配置不完整，请先设置 Base URL 和 API Key')
  }

  const model = request.model ?? settings.defaultModel
  if (!model) {
    throw new AiClientError('INVALID_CONFIG', '未指定模型，请在请求中传入 model 或设置默认模型')
  }

  const endpoint = `${normalizeBaseUrl(settings.baseUrl)}/chat/completions`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildRequestBody(request, model)),
      signal: request.signal,
    })
  } catch (error) {
    throw new AiClientError('NETWORK_ERROR', 'OpenAI 兼容服务请求失败，请检查网络或配置', error)
  }

  let responseJson: unknown
  try {
    responseJson = await response.json()
  } catch (error) {
    throw new AiClientError('UPSTREAM_ERROR', 'OpenAI 兼容服务返回数据解析失败', error)
  }

  if (!response.ok) {
    throw new AiClientError('UPSTREAM_ERROR', `OpenAI 兼容服务请求失败 (${response.status})`, responseJson)
  }

  const typedResponse = responseJson as OpenAiChatResponse
  const content = resolveMessageContent(typedResponse.choices?.[0]?.message?.content)
  if (!content) {
    throw new AiClientError('UPSTREAM_ERROR', 'OpenAI 兼容服务未返回有效内容', responseJson)
  }

  return {
    content,
    model: typeof typedResponse.model === 'string' ? typedResponse.model : model,
    raw: responseJson,
  }
}
