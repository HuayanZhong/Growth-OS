/**
 * Session 域 HTTP 契约（领域地图：会话生命周期、事件日志、消息投影）。
 *
 * 事件日志是会话的唯一事实源：events 端点返回录制/回放同构的 SessionEvent[]
 * （fixture 即此格式，见 @growth-os/shared 的 deriveMessages）；messages 端点
 * 返回服务端投影后的模型可见历史。持久化在阶段三落地，本契约先行。
 */
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

export type CreateSessionInput = {
  agentId: string
  title?: string
}

export type UpdateSessionInput = {
  title?: string
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
}
