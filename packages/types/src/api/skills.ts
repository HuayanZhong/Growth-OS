/**
 * Skill 域 HTTP 契约（领域地图：技能包注册、目录、启用状态）。
 *
 * Skill 同时是 Agent 的工具目录来源（Agent.toolIds 引用本域的 id）。
 */
import type { HttpEndpoint } from './http.ts'

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

export type CreateSkillInput = Pick<Skill, 'name'> & Partial<Pick<Skill, 'description' | 'enabled'>>

export type UpdateSkillInput = Partial<CreateSkillInput>

export interface SkillsApiMap {
  'GET /skills': HttpEndpoint<'GET', undefined, Skill[]>
  'POST /skills': HttpEndpoint<'POST', CreateSkillInput, Skill>
  'GET /skills/:id': HttpEndpoint<'GET', undefined, Skill>
  'PATCH /skills/:id': HttpEndpoint<'PATCH', UpdateSkillInput, Skill>
  'DELETE /skills/:id': HttpEndpoint<'DELETE', undefined, undefined>
}
