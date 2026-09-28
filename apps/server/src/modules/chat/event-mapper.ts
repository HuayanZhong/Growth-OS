import type { ChatStreamEvent } from '@growth-os/types'
import type { GraphEvent } from '../graph/graph-event.ts'

/** 一次流式回复的会话句柄：帧 id 由 chat 层统一铸造 */
export interface StreamSession {
  runId: string
  messageId: string
}

/**
 * GraphEvent → ChatStreamEvent 契约映射（唯一事件汇聚点的映射段）。
 * 仅翻译增量文本；start/end/finish 等生命周期帧由 service 编排。
 * 工具调用与意图类事件（tool_call_* / intent_* 预留名）在此扩展翻译。
 */
export function mapGraphEvent(
  event: GraphEvent,
  session: StreamSession,
): ChatStreamEvent | undefined {
  switch (event.type) {
    case 'text_delta':
      return { type: 'text_message_content', messageId: session.messageId, delta: event.delta }
    case 'turn_end':
      // turn_end 的生命周期帧（text_message_end / run_finished）由 service 统一收尾
      return undefined
  }
  return undefined
}
