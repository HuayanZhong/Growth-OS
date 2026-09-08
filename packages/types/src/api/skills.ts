/**
 * Skill 域 HTTP 契约（领域地图：技能包注册、目录、启用状态）。
 *
 * Skill 同时是 Agent 的工具目录来源（Agent.toolIds 引用本域的 id）。
 * 入参 schema 与类型共置（z.infer），前后端共用同一套校验约束。
 */
import { z } from 'zod'
import type { HttpEndpoint } from './http.ts'

export const createSkillSchema = z.object({
  name: z.string().min(1, 'name 不能为空').max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
})
export type CreateSkillInput = z.infer<typeof createSkillSchema>

export const updateSkillSchema = createSkillSchema.partial()
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>

export interface Skill {
  id: string
  name: string
  description?: string
  enabled: boolean
  /** epoch 毫秒 */
  createdAt: number
  /** epoch 毫秒 */
  updatedAt: number
}

export interface SkillsApiMap {
  'GET /skills': HttpEndpoint<'GET', undefined, Skill[]>
  'POST /skills': HttpEndpoint<'POST', CreateSkillInput, Skill>
  'GET /skills/:id': HttpEndpoint<'GET', undefined, Skill>
  'PATCH /skills/:id': HttpEndpoint<'PATCH', UpdateSkillInput, Skill>
  'DELETE /skills/:id': HttpEndpoint<'DELETE', undefined, undefined>
}
