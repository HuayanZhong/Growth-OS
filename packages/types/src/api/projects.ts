/**
 * Project 域 HTTP 契约（领域地图：项目聚合根，串联上述资源）。
 *
 * 聚合方式是 id 引用列表（非快照拷贝）：成员资源仍归各自域所有，
 * Project 只维护"哪些资源属于这个项目"。
 */
import type { HttpEndpoint } from './http.ts'

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

export type CreateProjectInput = Pick<Project, 'name'> &
  Partial<Pick<Project, 'description' | 'agentIds' | 'sessionIds' | 'skillIds' | 'fileIds'>>

export type UpdateProjectInput = Partial<CreateProjectInput>

export interface ProjectsApiMap {
  'GET /projects': HttpEndpoint<'GET', undefined, Project[]>
  'POST /projects': HttpEndpoint<'POST', CreateProjectInput, Project>
  'GET /projects/:id': HttpEndpoint<'GET', undefined, Project>
  'PATCH /projects/:id': HttpEndpoint<'PATCH', UpdateProjectInput, Project>
  'DELETE /projects/:id': HttpEndpoint<'DELETE', undefined, undefined>
}
