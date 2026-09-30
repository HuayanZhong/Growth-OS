import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { ChatStreamEvent, CreateChatStreamInput } from '@growth-os/types'
import { CHAT_TURN } from '../graph/graph.module.ts'
import type { ChatTurnRunner } from '../graph/run-chat-turn.ts'
import { mapGraphEvent } from './event-mapper.ts'
import type { StreamSession } from './event-mapper.ts'
import { analyzeIntent } from './intent.ts'

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * 流式聊天编排（唯一事件汇聚点）：意图分析 → 回合执行 → 契约映射。
 *
 * 管道即架构：所有事件必经本生成器；持久化、计量、经验池等旁路消费
 * 统一以 tap 包装本管道实现，不侵入编排（持久化是管道上的 sink，
 * 不是编排的步骤）。
 */
@Injectable()
export class ChatStreamService {
  constructor(@Inject(CHAT_TURN) private readonly chatTurn: ChatTurnRunner) {}

  async *run(input: CreateChatStreamInput, signal: AbortSignal): AsyncGenerator<ChatStreamEvent> {
    const runId = randomUUID()
    const messageId = randomUUID()
    const session: StreamSession = { runId, messageId }

    const intent = analyzeIntent(input)
    if (intent.type !== 'chat') {
      // chat 之外的意图类型在此分发（QA/task/meta 路由与澄清事件）
      yield { type: 'error', code: 'INTENT_UNSUPPORTED', message: '该意图暂未支持' }
      return
    }

    yield { type: 'run_started', runId }
    yield { type: 'text_message_start', messageId }

    try {
      // exactOptionalPropertyTypes：显式缺省不传 modelId 键（Auto 由编排侧路由）
      for await (const graphEvent of this.chatTurn(
        {
          messages: input.messages,
          ...(input.modelId !== undefined ? { modelId: input.modelId } : {}),
        },
        signal,
      )) {
        if (signal.aborted) return
        const event = mapGraphEvent(graphEvent, session)
        if (event) yield event
      }
      yield { type: 'text_message_end', messageId }
      yield { type: 'run_finished', runId }
    } catch (error) {
      // 客户端中断是正常路径：静默收尾，不发 error 事件
      if (signal.aborted || isAbortError(error)) return
      yield {
        type: 'error',
        code: 'CHAT_STREAM_FAILED',
        message: '回复生成失败，请稍后重试',
      }
    }
  }
}
