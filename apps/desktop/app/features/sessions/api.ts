/**
 * Session 域 typed client（迭代计划 2.6 前端 feature 化）。
 *
 * 入参/返回类型全部派生自 packages/types 的 SessionsApiMap 契约（复用 IPC 契约
 * 派生模式），本模块不重复声明业务类型；传输（token 注入、{ data } 信封解包、
 * ApiError 抛出）由 apiFetch 承担，这里只做路径拼接与契约桥接。
 */
import type { EndpointRequest, EndpointResponse, SessionsApiMap } from '@growth-os/types'
import { apiFetch } from '~/composables/useApi'

/** 各端点契约的本地别名（key 与 SessionsApiMap 一一对应） */
type ListSessions = SessionsApiMap['GET /sessions']
type CreateSession = SessionsApiMap['POST /sessions']
type GetSession = SessionsApiMap['GET /sessions/:id']
type UpdateSession = SessionsApiMap['PATCH /sessions/:id']
type DeleteSession = SessionsApiMap['DELETE /sessions/:id']
type GetSessionEvents = SessionsApiMap['GET /sessions/:id/events']
type GetSessionMessages = SessionsApiMap['GET /sessions/:id/messages']
type ForkSession = SessionsApiMap['POST /sessions/:id/fork']

/**
 * Session 域 HTTP 客户端：SessionsApiMap 的完整镜像。
 * 路径参数（:id）在此拼接进 path，不进入 request 类型。
 */
export const sessionsApi = {
  /** GET /sessions → SessionRecord[] */
  list: () => apiFetch<EndpointResponse<ListSessions>>('/sessions'),
  /** POST /sessions → SessionRecord（骨架期写路径 501 NOT_IMPLEMENTED） */
  create: (input: EndpointRequest<CreateSession>) =>
    apiFetch<EndpointResponse<CreateSession>>('/sessions', { method: 'POST', body: input }),
  /** GET /sessions/:id → SessionRecord（无数据 404 → ApiError NOT_FOUND） */
  getById: (id: string) => apiFetch<EndpointResponse<GetSession>>(`/sessions/${id}`),
  /** PATCH /sessions/:id → SessionRecord */
  update: (id: string, input: EndpointRequest<UpdateSession>) =>
    apiFetch<EndpointResponse<UpdateSession>>(`/sessions/${id}`, { method: 'PATCH', body: input }),
  /** DELETE /sessions/:id → 无业务数据（信封 {}，解包为 undefined） */
  remove: (id: string) =>
    apiFetch<EndpointResponse<DeleteSession>>(`/sessions/${id}`, { method: 'DELETE' }),
  /** GET /sessions/:id/events → SessionEvent[]（升序，录制-回放与事件溯源数据源） */
  events: (id: string) => apiFetch<EndpointResponse<GetSessionEvents>>(`/sessions/${id}/events`),
  /** GET /sessions/:id/messages → Message[]（服务端投影的模型可见历史） */
  messages: (id: string) =>
    apiFetch<EndpointResponse<GetSessionMessages>>(`/sessions/${id}/messages`),
  /** POST /sessions/:id/fork → ForkSessionResult（从 turn/step 边界事件分叉新会话） */
  fork: (id: string, input: EndpointRequest<ForkSession>) =>
    apiFetch<EndpointResponse<ForkSession>>(`/sessions/${id}/fork`, {
      method: 'POST',
      body: input,
    }),
}
