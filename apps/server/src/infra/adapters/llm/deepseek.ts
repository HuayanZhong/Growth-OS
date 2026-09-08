import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type {
  LLMAdapter,
  LLMChatParams,
  LLMChatResponse,
  LLMChunk,
  LLMMessage,
} from '@growth-os/types'

const DEFAULT_BASE_URL = 'https://api.deepseek.com'

/**
 * DeepSeek / OpenAI 兼容适配器（cookbook llm-adapter）：原生 fetch，无新依赖。
 * chat 必选；stream 走 OpenAI 兼容 SSE（data: {...} 行，data: [DONE] 结束）。
 */
@Injectable()
export class DeepseekAdapter implements LLMAdapter {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return this.config.get<string>('LLM_BASE_URL') ?? DEFAULT_BASE_URL
  }

  private apiKey(): string {
    const apiKey = this.config.get<string>('LLM_API_KEY')
    if (!apiKey) throw new Error('LLM_API_KEY is not set')
    return apiKey
  }

  /** 会话投影的 Message（四角色）→ OpenAI 兼容消息格式 */
  private toOpenAIMessage(message: LLMMessage): Record<string, unknown> {
    if (message.role === 'tool') {
      return { role: 'tool', tool_call_id: message.toolCallId, content: message.content }
    }
    if (message.role === 'assistant' && message.toolCalls?.length) {
      return {
        role: 'assistant',
        content: message.content,
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: call.arguments },
        })),
      }
    }
    return { role: message.role, content: message.content }
  }

  private requestInit(params: LLMChatParams, apiKey: string, stream: boolean): RequestInit {
    return {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        ...(stream ? { accept: 'text/event-stream' } : {}),
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages.map((m) => this.toOpenAIMessage(m)),
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        ...(stream ? { stream: true } : {}),
      }),
      // exactOptionalPropertyTypes 下 RequestInit.signal 为 AbortSignal | null
      ...(params.signal ? { signal: params.signal } : {}),
    }
  }

  async chat(params: LLMChatParams): Promise<LLMChatResponse> {
    const res = await fetch(
      `${this.baseUrl()}/chat/completions`,
      this.requestInit(params, this.apiKey(), false),
    )
    if (!res.ok) throw new Error(`LLM request failed: ${res.status}`)
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>
      usage: { prompt_tokens: number; completion_tokens: number }
    }
    return {
      content: data.choices[0]?.message.content ?? '',
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      },
    }
  }

  /** OpenAI 兼容 SSE：按事件边界（空行）切块，增量 delta.content 逐个产出 */
  async *stream(params: LLMChatParams): AsyncGenerator<LLMChunk, void, unknown> {
    const res = await fetch(
      `${this.baseUrl()}/chat/completions`,
      this.requestInit(params, this.apiKey(), true),
    )
    if (!res.ok || !res.body) throw new Error(`LLM request failed: ${res.status}`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let boundary = buffer.indexOf('\n\n')
      while (boundary >= 0) {
        const event = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') return
          const delta = (
            JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>
            }
          ).choices?.[0]?.delta?.content
          if (delta) yield { content: delta }
        }
        boundary = buffer.indexOf('\n\n')
      }
    }
  }
}
