/**
 * 会话事件投影（迭代计划 2.3 的运行时部分）。
 *
 * deriveMessages 是"模型可见即已记录"不变量的投影实现：
 * - 只投影 MessageEventType（user/assistant/system/context/tool）；
 * - BookkeepingEventType（turn/step/condensation 等）不进入模型历史；
 * - 不在词汇表内的事件类型直接抛错——词汇表漂移必须在投影处暴露，而非静默丢弃；
 * - 内容型 payload 缺失 content 同样抛错（抵达模型的内容必须可重建）。
 *
 * 事件词汇表（SessionEvent/Message 等）来自 @growth-os/types 的 type-only import，
 * 编译后零运行时依赖。
 */
import type {
  AssistantMessagePayload,
  Message,
  SessionEvent,
  SessionEventType,
  ToolCallPayload,
  ToolResultPayload,
} from '@growth-os/types'

/** 投影失败：事件类型不在词汇表，或内容型 payload 缺失必需字段 */
export class ProjectionError extends Error {
  constructor(
    message: string,
    readonly eventId: string,
  ) {
    super(message)
    this.name = 'ProjectionError'
  }
}

interface ContentPayload {
  content: string
}

function requireContent(event: SessionEvent): ContentPayload {
  const payload = event.payload as Partial<ContentPayload> | null
  if (typeof payload?.content !== 'string') {
    throw new ProjectionError(`事件 ${event.type} 缺失 content 字段，无法投影为消息`, event.id)
  }
  return { content: payload.content }
}

function requirePayload<T>(event: SessionEvent): T {
  if (event.payload === null || typeof event.payload !== 'object') {
    throw new ProjectionError(`事件 ${event.type} 的 payload 必须是对象`, event.id)
  }
  return event.payload as T
}

/**
 * 从事件序列投影出模型可见消息历史。
 *
 * @param events 按时间升序的会话事件序列（即录制-回放的 fixture 格式）
 * @returns 与输入同序的 Message 数组；bookkeeping 事件被跳过
 * @throws ProjectionError 事件类型不在词汇表，或内容型 payload 缺失 content
 */
export function deriveMessages(events: readonly SessionEvent[]): Message[] {
  const messages: Message[] = []

  for (const event of events) {
    const type = event.type as SessionEventType
    switch (type) {
      case 'user_message': {
        messages.push({ role: 'user', content: requireContent(event).content })
        break
      }
      case 'assistant_message': {
        const payload = requirePayload<AssistantMessagePayload>(event)
        if (typeof payload.content !== 'string') {
          throw new ProjectionError(
            `事件 ${event.type} 缺失 content 字段，无法投影为消息`,
            event.id,
          )
        }
        messages.push({
          role: 'assistant',
          content: payload.content,
          ...(payload.toolCalls ? { toolCalls: payload.toolCalls } : {}),
        })
        break
      }
      case 'tool_call': {
        const payload = requirePayload<ToolCallPayload>(event)
        if (typeof payload.callId !== 'string' || typeof payload.name !== 'string') {
          throw new ProjectionError(`事件 ${event.type} 缺失 callId/name 字段`, event.id)
        }
        messages.push({
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: payload.callId, name: payload.name, arguments: payload.arguments ?? '' },
          ],
        })
        break
      }
      case 'tool_result': {
        const payload = requirePayload<ToolResultPayload>(event)
        if (typeof payload.callId !== 'string') {
          throw new ProjectionError(`事件 ${event.type} 缺失 callId 字段`, event.id)
        }
        messages.push({
          role: 'tool',
          content: requireContent(event).content,
          toolCallId: payload.callId,
        })
        break
      }
      case 'system_prompt':
      case 'context_injection': {
        messages.push({ role: 'system', content: requireContent(event).content })
        break
      }
      case 'turn_start':
      case 'turn_end':
      case 'step_start':
      case 'step_end':
      case 'condensation':
      case 'agent_created':
      case 'agent_status_changed': {
        // 簿记事件：状态管理/控制流，不进入模型历史
        break
      }
      default: {
        // 词汇表漂移防护：新事件类型必须先进词汇表，再进投影
        throw new ProjectionError(
          `未知事件类型 ${String(event.type)}，不在会话事件词汇表内`,
          event.id,
        )
      }
    }
  }

  return messages
}
