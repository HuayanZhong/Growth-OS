/**
 * Agent 域 HTTP 契约（迭代计划 2.6 / 领域地图：人设、模型、工具绑定、CRUD）。
 *
 * 类型先行：controller 骨架（apps/server/src/modules/agents/）按此实现，
 * 前端 feature typed client（app/features/agents/api.ts）按此消费。
 * 入参 schema 与类型共置（z.infer），前后端共用同一套校验约束。
 */
import { z } from 'zod'
import type { HttpEndpoint } from './http.ts'

export const createAgentSchema = z.object({
  name: z.string().min(1, 'name 不能为空').max(100),
  /** 人设/系统指令 */
  systemPrompt: z.string().min(1, 'systemPrompt 不能为空'),
  /** 模型标识（如 deepseek-chat），适配器层据此路由 */
  model: z.string().min(1, 'model 不能为空'),
  description: z.string().max(500).optional(),
  toolIds: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
})
export type CreateAgentInput = z.infer<typeof createAgentSchema>

export const updateAgentSchema = createAgentSchema.partial()
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>

/**
 * Agent 实体：模型可见的编排单元（人设 + 模型 + 工具绑定）。
 * 在 create schema 基础上覆盖/补充服务端生成的字段；可选项（toolIds/enabled）
 * 在实体中必有值，因此覆盖为必填。
 */
export const agentSchema = createAgentSchema.extend({
  id: z.string(),
  toolIds: z.array(z.string()),
  enabled: z.boolean(),
  /** epoch 毫秒 */
  createdAt: z.number().int(),
  /** epoch 毫秒 */
  updatedAt: z.number().int(),
})
export type Agent = z.infer<typeof agentSchema>

export interface AgentsApiMap {
  'GET /agents': HttpEndpoint<'GET', undefined, Agent[]>
  'POST /agents': HttpEndpoint<'POST', CreateAgentInput, Agent>
  'GET /agents/:id': HttpEndpoint<'GET', undefined, Agent>
  'PATCH /agents/:id': HttpEndpoint<'PATCH', UpdateAgentInput, Agent>
  'DELETE /agents/:id': HttpEndpoint<'DELETE', undefined, undefined>
}
