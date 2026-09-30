import type { ChatMessageContentPart } from '@growth-os/types'
import { isVisionModel, resolveAutoModelId } from '../model-provider/registry.ts'
import type { ModelFactory } from '../model-provider/factory.ts'
import { createChatAgent } from './chat-agent.ts'
import type { ChatTurnInput, GraphEvent } from './graph-event.ts'

/** 回合执行器：输入消息历史 → GraphEvent 流（graph 对外唯一接口） */
export type ChatTurnRunner = (
  input: ChatTurnInput,
  signal: AbortSignal,
) => AsyncIterable<GraphEvent>

/** LangChain 多模态消息内容块（OpenAI 兼容形态） */
type ModelContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

/** 消息历史是否携带图片分段（Auto 路由依据） */
function hasImageSegments(input: ChatTurnInput): boolean {
  return input.messages.some(
    (message) =>
      typeof message.content !== 'string' &&
      message.content.some((part) => part.type === 'image_url'),
  )
}

/**
 * 单条消息 content → 模型可消费形态：字符串原样；分段数组按当前模型
 * 视觉能力映射——视觉模型 image 段透传为 LangChain content block，
 * 非视觉模型将 image 段替换为文本占位（历史携带旧图不中断对话）。
 */
function toModelContent(
  content: string | ReadonlyArray<ChatMessageContentPart>,
  vision: boolean,
): string | ModelContentBlock[] {
  if (typeof content === 'string') return content
  return content.map((part): ModelContentBlock => {
    if (part.type === 'text') return { type: 'text', text: part.text }
    return vision
      ? { type: 'image_url', image_url: { url: part.imageUrl.url } }
      : { type: 'text', text: '[图片]' }
  })
}

/**
 * 创建回合执行器：每回合按输入装配一次 deepagents Agent（无 checkpointer，
 * 每回合独立无状态；模型随请求可变，故不预装配），以 v3 流式投影消费文本 token。
 *
 * 模型解析：显式 modelId 优先（调用方已校验注册表归属）；缺省走 Auto 路由——
 * 消息携带图片分段选视觉模型，纯文本走注册表默认模型。
 *
 * 客户端中断：signal 直接透传 deepagents（AbortSignal 中止模型调用，
 * 迭代以 AbortError 终止），错误形态由 chat 层区分处理。
 */
export function createChatTurnRunner(factory: ModelFactory): ChatTurnRunner {
  return async function* runChatTurn(input, signal) {
    const modelId = input.modelId ?? resolveAutoModelId(hasImageSegments(input))
    const vision = isVisionModel(modelId)
    const agent = createChatAgent(factory(modelId))

    const run = await agent.streamEvents(
      {
        messages: input.messages.map((message) => ({
          role: message.role,
          content: toModelContent(message.content, vision),
        })),
      },
      { version: 'v3', signal },
    )
    for await (const msg of run.messages) {
      for await (const token of msg.text) {
        yield { type: 'text_delta', delta: token }
      }
    }
    yield { type: 'turn_end' }
  }
}
