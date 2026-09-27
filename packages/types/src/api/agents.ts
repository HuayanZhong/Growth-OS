/**
 * Agent 目录 HTTP 契约（server-agent-directory）。
 *
 * 目录以服务端为唯一数据源：内置默认 Agent 为迁移 seed 的全局共享行
 * （isDefault = true，对所有登录用户只读可见），自定义 Agent 按创建者
 * （JWT sub → user_id）隔离，且同一用户下名称唯一。slug 由服务端生成、
 * 用于前端路由；删除等资源操作以主键 id 定位。
 */
import { z } from 'zod'
import type { HttpEndpoint } from './http.ts'

/** Agent 的 schema：目录条目（默认 Agent 与自定义 Agent 同构） */
export const agentSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  emotion: z.string(),
  color: z.string().optional(),
  description: z.string().optional(),
  skills: z.array(z.string()).optional(),
})
export type Agent = z.infer<typeof agentSchema>

/** 创建自定义 Agent 入参（id/slug/isDefault 由服务端决定） */
export const createAgentSchema = z.object({
  name: z.string().trim().min(1).max(50),
  emotion: z.string().min(1),
  color: z.string().optional(),
  description: z.string().trim().max(500).optional(),
  skills: z.array(z.string().min(1)).max(50).optional(),
})
export type CreateAgentInput = z.infer<typeof createAgentSchema>

/** 删除确认响应 */
export const deleteAgentResultSchema = z.object({ deleted: z.literal(true) })
export type DeleteAgentResult = z.infer<typeof deleteAgentResultSchema>

export interface AgentApiMap {
  /** 创建自定义 Agent（slug/id 服务端生成；同用户下重名返回 409 AGENT_NAME_EXISTS） */
  'POST /agents': HttpEndpoint<'POST', CreateAgentInput, Agent>
  /** 目录列表：默认 Agent 在前 + 本人自建按创建时间升序 */
  'GET /agents': HttpEndpoint<'GET', undefined, Agent[]>
  /** 删除自定义 Agent（path 参数为主键 id；默认行 403，非本人 404） */
  'DELETE /agents/:id': HttpEndpoint<'DELETE', undefined, DeleteAgentResult>
}
