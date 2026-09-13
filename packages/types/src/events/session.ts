/**
 * 会话事件词汇表（迭代计划 2.3）。
 *
 * 设计约束：
 * 1. "模型可见即已记录"不变量：凡抵达模型请求的内容，必须能从事件日志重建。
 * 2. 可投影事件与簿记事件分离：deriveMessages 只投影前者，簿记事件不进入模型历史。
 * 3. turn/step 边界事件：会话 fork 的 boundary 定义在这些边界上。
 *
 * schema 是类型的事实源：TS 类型一律 z.infer / 数组派生，勿手写重复的字面量联合。
 * 投影函数 deriveMessages 在 @growth-os/shared，持久化（SessionEventLog 实现）
 * 在阶段三落地于 sessions 域。
 */
import { z } from 'zod'

// ============================================================
// 模型可见消息
// ============================================================

/** MessageRole 的 schema */
export const messageRoleSchema = z.enum(['system', 'user', 'assistant', 'tool'])
/** 模型可见历史消息角色——升格自 app/components/chat/types.ts 的 ChatMessage（role 扩展至四角色） */
export type MessageRole = z.infer<typeof messageRoleSchema>

/** ToolCallRef 的 schema：工具调用引用（assistant 消息携带 / tool 结果回指） */
export const toolCallRefSchema = z.object({
  /** 调用唯一 id，tool 结果通过 toolCallId 回指 */
  id: z.string(),
  /** 工具名 */
  name: z.string(),
  /** 序列化的调用参数（JSON 字符串） */
  arguments: z.string(),
})
/** 工具调用引用（assistant 消息携带 / tool 结果回指） */
export type ToolCallRef = z.infer<typeof toolCallRefSchema>

/** Message 的 schema：模型可见历史消息 */
export const messageSchema = z.object({
  role: messageRoleSchema,
  content: z.string(),
  /** role='tool' 时：本条结果对应的调用 id */
  toolCallId: z.string().optional(),
  /** role='assistant' 时：本条消息携带的工具调用 */
  toolCalls: z.array(toolCallRefSchema).optional(),
})
export type Message = z.infer<typeof messageSchema>

/** UI 聊天消息：聊天组件消费的窄角色子集（完整四角色模型历史见 Message） */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ============================================================
// 事件类型词汇（数组是唯一字面量源，type 与 z.enum 均由此派生）
// ============================================================

/** 可投影为模型消息的事件（deriveMessages 只取这些） */
export const messageEventTypes = [
  'user_message',
  'assistant_message',
  'tool_call',
  'tool_result',
  'system_prompt',
  'context_injection',
] as const
export type MessageEventType = (typeof messageEventTypes)[number]

/** 内部簿记事件：状态管理/控制流，不进入模型历史 */
export const bookkeepingEventTypes = [
  'turn_start',
  'turn_end',
  'step_start',
  'step_end',
  'condensation',
  'agent_created',
  'agent_status_changed',
] as const
export type BookkeepingEventType = (typeof bookkeepingEventTypes)[number]

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
// 事件与日志契约
// ============================================================

/** SessionEvent 的 schema：payload 各事件类型自行收窄，此处为开放结构 */
export const sessionEventSchema = z.object({
  id: z.string(),
  type: z.enum([...messageEventTypes, ...bookkeepingEventTypes]),
  /** epoch 毫秒 */
  timestamp: z.number().int(),
  sessionId: z.string(),
  agentId: z.string().optional(),
  payload: z.unknown(),
})
export type SessionEvent = z.infer<typeof sessionEventSchema>

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
