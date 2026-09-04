/**
 * 会话事件词汇表（迭代计划 2.3）。
 *
 * 设计约束：
 * 1. "模型可见即已记录"不变量：凡抵达模型请求的内容，必须能从事件日志重建。
 * 2. 可投影事件与簿记事件分离：deriveMessages 只投影前者，簿记事件不进入模型历史。
 * 3. turn/step 边界事件：会话 fork 的 boundary 定义在这些边界上。
 *
 * 本模块只放类型；投影函数 deriveMessages 在 @growth-os/shared，
 * 持久化（SessionEventLog 实现）在阶段三落地于 sessions 域。
 */

/** 模型可见历史消息——升格自 app/components/chat/types.ts 的 ChatMessage（role 扩展至四角色） */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/** 工具调用引用（assistant 消息携带 / tool 结果回指） */
export interface ToolCallRef {
  /** 调用唯一 id，tool 结果通过 toolCallId 回指 */
  id: string
  /** 工具名 */
  name: string
  /** 序列化的调用参数（JSON 字符串） */
  arguments: string
}

export interface Message {
  role: MessageRole
  content: string
  /** role='tool' 时：本条结果对应的调用 id */
  toolCallId?: string
  /** role='assistant' 时：本条消息携带的工具调用 */
  toolCalls?: ToolCallRef[]
}

/** 可投影为模型消息的事件（deriveMessages 只取这些） */
export type MessageEventType =
  | 'user_message'
  | 'assistant_message'
  | 'tool_call'
  | 'tool_result'
  | 'system_prompt'
  | 'context_injection'

/** 内部簿记事件：状态管理/控制流，不进入模型历史 */
export type BookkeepingEventType =
  | 'turn_start'
  | 'turn_end'
  | 'step_start'
  | 'step_end'
  | 'condensation'
  | 'agent_created'
  | 'agent_status_changed'

export type SessionEventType = MessageEventType | BookkeepingEventType

// ============================================================
// 可投影事件的 payload 契约
// ============================================================

export interface UserMessagePayload {
  content: string
}

export interface AssistantMessagePayload {
  content: string
  /** 本条助手消息携带的工具调用 */
  toolCalls?: ToolCallRef[]
}

export interface ToolCallPayload {
  /** 调用唯一 id，后续 tool_result 通过它回指 */
  callId: string
  name: string
  /** 序列化的调用参数（JSON 字符串） */
  arguments: string
}

export interface ToolResultPayload {
  /** 对应 tool_call 的 callId */
  callId: string
  content: string
}

export interface SystemPromptPayload {
  content: string
}

export interface ContextInjectionPayload {
  content: string
}

/** SessionEvent.type → payload 类型的映射（事件构造方与投影方共用） */
export interface MessageEventPayloadMap extends Record<MessageEventType, unknown> {
  user_message: UserMessagePayload
  assistant_message: AssistantMessagePayload
  tool_call: ToolCallPayload
  tool_result: ToolResultPayload
  system_prompt: SystemPromptPayload
  context_injection: ContextInjectionPayload
}

// ============================================================
// 事件与日志接口
// ============================================================

export interface SessionEvent {
  id: string
  type: SessionEventType
  /** epoch 毫秒 */
  timestamp: number
  sessionId: string
  agentId?: string
  /** 按事件类型收窄：MessageEventType 对应 MessageEventPayloadMap，簿记事件自定义 */
  payload: unknown
}

/** 类型收窄的会话事件：指定 MessageEventType 时 payload 具有对应类型 */
export interface TypedSessionEvent<T extends SessionEventType> extends Omit<
  SessionEvent,
  'type' | 'payload'
> {
  type: T
  payload: T extends MessageEventType ? MessageEventPayloadMap[T] : unknown
}

export interface EventFilter {
  sessionId?: string
  agentId?: string
  type?: SessionEventType
  /** epoch 毫秒下界 */
  from?: number
  /** epoch 毫秒上界 */
  to?: number
  limit?: number
}

/**
 * 会话事件日志契约（append-only）。
 *
 * 阶段三在 sessions 域落地实现：后端 PostgreSQL（MikroORM）、前端 IndexedDB。
 * boundary 仅接受 turn/step 边界事件的 id。
 */
export interface SessionEventLog {
  append(event: SessionEvent): Promise<void>
  query(filter: EventFilter): Promise<SessionEvent[]>
  /** 只投影 MessageEventType 为模型可见历史 */
  deriveMessages(): Promise<Message[]>
  /** 从 boundary 事件处分叉出新会话日志 */
  fork(boundaryEventId: string): Promise<SessionEventLog>
}
