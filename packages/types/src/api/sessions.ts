/**
 * Session 域 HTTP 契约（领域地图：会话生命周期、事件日志、消息投影）。
 *
 * 事件日志是会话的唯一事实源：events 端点返回录制/回放同构的 SessionEvent[]
 * （fixture 即此格式，见 @growth-os/shared 的 deriveMessages）；messages 端点
 * 返回服务端投影后的模型可见历史。持久化在阶段三落地，本契约先行。
 */
import { z } from 'zod'
import type { Message, SessionEvent } from '../events/session.ts'
import type { HttpEndpoint } from './http.ts'

/** 会话记录（消息与事件经子资源端点访问） */
export interface SessionRecord {
  id: string
  /** 会话绑定的 Agent */
  agentId: string
  title: string
  /** epoch 毫秒 */
  createdAt: number
  /** epoch 毫秒 */
  updatedAt: number
}

export const createSessionSchema = z.object({
  agentId: z.string().min(1, 'agentId 不能为空'),
  title: z.string().min(1).max(100).optional(),
})
export type CreateSessionInput = z.infer<typeof createSessionSchema>

export const updateSessionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
})
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>

/** fork 入参：boundary 必须是源会话中 turn/step 边界事件的 id */
export const forkSessionSchema = z.object({
  boundaryEventId: z.string().min(1, 'boundaryEventId 不能为空'),
})
export type ForkSessionInput = z.infer<typeof forkSessionSchema>

/** 发送用户消息（触发一个回合：turn_start → user → assistant → turn_end） */
export const sendMessageSchema = z.object({
  content: z.string().min(1, '消息内容不能为空').max(32_000, '消息内容过长'),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>

/** fork 结果：新会话 id 与复制的事件数（复制范围含 boundary 事件） */
export interface ForkSessionResult {
  sessionId: string
  copiedEvents: number
}

/** 回合结果：本回合写入的事件 id（按序）与 assistant 回复 */
export interface TurnResult {
  eventIds: string[]
  reply: Message
}

export interface SessionsApiMap {
  'GET /sessions': HttpEndpoint<'GET', undefined, SessionRecord[]>
  'POST /sessions': HttpEndpoint<'POST', CreateSessionInput, SessionRecord>
  'GET /sessions/:id': HttpEndpoint<'GET', undefined, SessionRecord>
  'PATCH /sessions/:id': HttpEndpoint<'PATCH', UpdateSessionInput, SessionRecord>
  'DELETE /sessions/:id': HttpEndpoint<'DELETE', undefined, undefined>
  /** 会话事件序列（升序）——录制-回放与事件溯源的数据源 */
  'GET /sessions/:id/events': HttpEndpoint<'GET', undefined, SessionEvent[]>
  /** 服务端投影后的模型可见消息历史（等价于对 events 跑 deriveMessages） */
  'GET /sessions/:id/messages': HttpEndpoint<'GET', undefined, Message[]>
  /**
   * 发送用户消息并执行一个回合：会话绑定 Agent 的模型生成回复，
   * 事件序 turn_start → user_message → assistant_message → turn_end 落库
   */
  'POST /sessions/:id/messages': HttpEndpoint<'POST', SendMessageInput, TurnResult>
  /**
   * 从 turn/step 边界事件处分叉新会话：复制源会话 seq ≤ boundary 的事件到新会话
   * （boundary 非边界类型 → 400 BAD_REQUEST；boundary 不存在 → 404 NOT_FOUND）
   */
  'POST /sessions/:id/fork': HttpEndpoint<'POST', ForkSessionInput, ForkSessionResult>
}
