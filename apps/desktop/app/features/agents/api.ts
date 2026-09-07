/**
 * Agent 域 typed client（迭代计划 2.6 前端 feature 化样板）。
 *
 * 入参/返回类型全部派生自 packages/types 的 AgentsApiMap 契约（复用 IPC 契约
 * 派生模式），本模块不重复声明业务类型；传输（token 注入、{ data } 信封解包、
 * ApiError 抛出）由 apiFetch 承担，这里只做路径拼接与契约桥接。
 */
import type { AgentsApiMap, EndpointRequest, EndpointResponse } from '@growth-os/types'
import { apiFetch } from '~/composables/useApi'

/** 各端点契约的本地别名（key 与 AgentsApiMap 一一对应） */
type ListAgents = AgentsApiMap['GET /agents']
type GetAgent = AgentsApiMap['GET /agents/:id']
type CreateAgent = AgentsApiMap['POST /agents']
type UpdateAgent = AgentsApiMap['PATCH /agents/:id']
type DeleteAgent = AgentsApiMap['DELETE /agents/:id']

/**
 * Agent 域 HTTP 客户端：AgentsApiMap 的完整镜像。
 * 路径参数（:id）在此拼接进 path，不进入 request 类型。
 */
export const agentsApi = {
  /** GET /agents → Agent[] */
  list: () => apiFetch<EndpointResponse<ListAgents>>('/agents'),
  /** GET /agents/:id → Agent（无数据 404 → ApiError NOT_FOUND） */
  getById: (id: string) => apiFetch<EndpointResponse<GetAgent>>(`/agents/${id}`),
  /** POST /agents → Agent（骨架期写路径 501 NOT_IMPLEMENTED） */
  create: (input: EndpointRequest<CreateAgent>) =>
    apiFetch<EndpointResponse<CreateAgent>>('/agents', { method: 'POST', body: input }),
  /** PATCH /agents/:id → Agent */
  update: (id: string, input: EndpointRequest<UpdateAgent>) =>
    apiFetch<EndpointResponse<UpdateAgent>>(`/agents/${id}`, { method: 'PATCH', body: input }),
  /** DELETE /agents/:id → 无业务数据（信封 {}，解包为 undefined） */
  remove: (id: string) =>
    apiFetch<EndpointResponse<DeleteAgent>>(`/agents/${id}`, { method: 'DELETE' }),
}
