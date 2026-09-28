import { DEEPSEEK_PROVIDER } from '../model-provider/registry.ts'
import type { ModelFactory } from '../model-provider/factory.ts'
import { createChatAgent } from './chat-agent.ts'
import type { ChatTurnInput, GraphEvent } from './graph-event.ts'

/** 回合执行器：输入消息历史 → GraphEvent 流（graph 对外唯一接口） */
export type ChatTurnRunner = (
  input: ChatTurnInput,
  signal: AbortSignal,
) => AsyncIterable<GraphEvent>

/**
 * 创建回合执行器：装配一次 deepagents Agent（无 checkpointer，每回合
 * 独立无状态），以 v3 流式投影消费文本 token。
 *
 * 客户端中断：signal 直接透传 deepagents（AbortSignal 中止模型调用，
 * 迭代以 AbortError 终止），错误形态由 chat 层区分处理。
 */
export function createChatTurnRunner(
  factory: ModelFactory,
  modelId: string = DEEPSEEK_PROVIDER.defaultModel,
): ChatTurnRunner {
  const agent = createChatAgent(factory(modelId))

  return async function* runChatTurn(input, signal) {
    const run = await agent.streamEvents(
      { messages: input.messages.map((m) => ({ role: m.role, content: m.content })) },
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
