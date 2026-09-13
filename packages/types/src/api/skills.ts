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

/** Skill 实体：技能包注册与启用状态。enabled 在实体中必有值，覆盖为必填 */
export const skillSchema = createSkillSchema.extend({
  id: z.string(),
  enabled: z.boolean(),
  /** epoch 毫秒 */
  createdAt: z.number().int(),
  /** epoch 毫秒 */
  updatedAt: z.number().int(),
})
export type Skill = z.infer<typeof skillSchema>

export interface SkillsApiMap {
  'GET /skills': HttpEndpoint<'GET', undefined, Skill[]>
  'POST /skills': HttpEndpoint<'POST', CreateSkillInput, Skill>
  'GET /skills/:id': HttpEndpoint<'GET', undefined, Skill>
  'PATCH /skills/:id': HttpEndpoint<'PATCH', UpdateSkillInput, Skill>
  'DELETE /skills/:id': HttpEndpoint<'DELETE', undefined, undefined>
}
