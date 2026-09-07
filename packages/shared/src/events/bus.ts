/**
 * 类型化会话事件总线（迭代计划 3.3，最小实现）。
 *
 * - on/emit：emit 同步分发到该类型的全部 handler，返回值不影响分发（无
 *   waterfall/parallel/bail 等分发模式——等出现真实的多元消费者再按需增补）；
 * - 类型约束：handler 收到的事件按词汇表收窄（MessageEventType 的 payload
 *   具有对应类型，簿记事件 payload 为 unknown）；
 * - 词汇表漂移防护：emit 不在词汇表内的事件类型立即抛错——漂移必须在生产
 *   处暴露，而非静默丢失（与投影处 deriveMessages 的防护对称）。
 *
 * handler 异常不做隔离/吞错（fail fast）：一个 handler 抛错会中断本轮分发，
 * 需要隔离语义时在 handler 内部自行捕获。本模块只放机制，不绑定任何单例；
 * 消费方经工厂创建并自行决定生命周期。
 */
import type { SessionEvent, SessionEventType, TypedSessionEvent } from '@growth-os/types'

/** 事件类型不在会话事件词汇表内 */
export class EventVocabularyError extends Error {
  constructor(
    message: string,
    readonly eventType: string,
  ) {
    super(message)
    this.name = 'EventVocabularyError'
  }
}

/** 会话事件词汇表的运行时集合（与 types 的 SessionEventType 联合类型对应） */
const SESSION_EVENT_TYPES: ReadonlySet<string> = new Set([
  'user_message',
  'assistant_message',
  'tool_call',
  'tool_result',
  'system_prompt',
  'context_injection',
  'turn_start',
  'turn_end',
  'step_start',
  'step_end',
  'condensation',
  'agent_created',
  'agent_status_changed',
] as const satisfies readonly SessionEventType[])

type EventHandler<T extends SessionEventType> = (event: TypedSessionEvent<T>) => void

export interface SessionEventBus {
  /**
   * 订阅指定类型的事件，返回取消订阅函数。
   * handler 收到的事件类型按词汇表收窄。
   */
  on<T extends SessionEventType>(type: T, handler: EventHandler<T>): () => void
  /** 同步分发事件到该类型的全部 handler（按订阅顺序） */
  emit(event: SessionEvent): void
  /** 当前订阅数（测试/诊断用） */
  listenerCount(type: SessionEventType): number
}

export function createSessionEventBus(): SessionEventBus {
  const handlers = new Map<SessionEventType, Set<EventHandler<SessionEventType>>>()

  return {
    on<T extends SessionEventType>(type: T, handler: EventHandler<T>): () => void {
      let set = handlers.get(type)
      if (!set) {
        set = new Set()
        handlers.set(type, set)
      }
      set.add(handler as EventHandler<SessionEventType>)
      return () => {
        set?.delete(handler as EventHandler<SessionEventType>)
      }
    },

    emit(event: SessionEvent): void {
      if (!SESSION_EVENT_TYPES.has(event.type)) {
        throw new EventVocabularyError(
          `未知事件类型 ${String(event.type)}，不在会话事件词汇表内`,
          String(event.type),
        )
      }
      const set = handlers.get(event.type)
      if (!set) {
        return
      }
      for (const handler of set) {
        ;(handler as EventHandler<typeof event.type>)(event as TypedSessionEvent<typeof event.type>)
      }
    },

    listenerCount(type: SessionEventType): number {
      return handlers.get(type)?.size ?? 0
    },
  }
}
