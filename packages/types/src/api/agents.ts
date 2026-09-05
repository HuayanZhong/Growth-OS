/**
 * Agent 域 HTTP 契约（迭代计划 2.6 / 领域地图：人设、模型、工具绑定、CRUD）。
 *
 * 类型先行：controller 骨架（apps/server/src/modules/agents/）按此实现，
 * 前端 feature typed client（app/features/agents/api.ts）按此消费。
 */
import type { HttpEndpoint } from './http.ts'

/** Agent 实体：模型可见的编排单元（人设 + 模型 + 工具绑定） */
export interface Agent {
  id: string
  name: string
  /** 人设/系统指令 */
  systemPrompt: string
  /** 模型标识（如 deepseek-chat），适配器层据此路由 */
  model: string
  /** 绑定的工具 id 列表（Skill 域提供目录） */
  toolIds: string[]
  description?: string
  enabled: boolean
  /** epoch 毫秒 */
  createdAt: number
  /** epoch 毫秒 */
  updatedAt: number
}

export type CreateAgentInput = Pick<Agent, 'name' | 'systemPrompt' | 'model'> &
  Partial<Pick<Agent, 'description' | 'toolIds' | 'enabled'>>

export type UpdateAgentInput = Partial<CreateAgentInput>

export interface AgentsApiMap {
  'GET /agents': HttpEndpoint<'GET', undefined, Agent[]>
  'POST /agents': HttpEndpoint<'POST', CreateAgentInput, Agent>
  'GET /agents/:id': HttpEndpoint<'GET', undefined, Agent>
  'PATCH /agents/:id': HttpEndpoint<'PATCH', UpdateAgentInput, Agent>
  'DELETE /agents/:id': HttpEndpoint<'DELETE', undefined, undefined>
}
