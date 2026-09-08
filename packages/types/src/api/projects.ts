/**
 * Project 域 HTTP 契约（领域地图：项目聚合根，串联上述资源）。
 *
 * 聚合方式是 id 引用列表（非快照拷贝）：成员资源仍归各自域所有，
 * Project 只维护"哪些资源属于这个项目"。
 * 入参 schema 与类型共置（z.infer），前后端共用同一套校验约束。
 */
import { z } from 'zod'
import type { HttpEndpoint } from './http.ts'

export const createProjectSchema = z.object({
  name: z.string().min(1, 'name 不能为空').max(100),
  description: z.string().max(500).optional(),
  agentIds: z.array(z.string()).optional(),
  sessionIds: z.array(z.string()).optional(),
  skillIds: z.array(z.string()).optional(),
  fileIds: z.array(z.string()).optional(),
})
export type CreateProjectInput = z.infer<typeof createProjectSchema>

export const updateProjectSchema = createProjectSchema.partial()
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

export interface Project {
  id: string
  name: string
  description?: string
  agentIds: string[]
  sessionIds: string[]
  skillIds: string[]
  fileIds: string[]
  /** epoch 毫秒 */
  createdAt: number
  /** epoch 毫秒 */
  updatedAt: number
}

export interface ProjectsApiMap {
  'GET /projects': HttpEndpoint<'GET', undefined, Project[]>
  'POST /projects': HttpEndpoint<'POST', CreateProjectInput, Project>
  'GET /projects/:id': HttpEndpoint<'GET', undefined, Project>
  'PATCH /projects/:id': HttpEndpoint<'PATCH', UpdateProjectInput, Project>
  'DELETE /projects/:id': HttpEndpoint<'DELETE', undefined, undefined>
}
