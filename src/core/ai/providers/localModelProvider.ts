import { AiClientError, type ChatCompletionRequest, type ChatCompletionResponse } from '../types'

export async function requestLocalModelChatCompletion(_request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  throw new AiClientError('NOT_IMPLEMENTED', '本地模型能力暂未开放，敬请期待')
}
