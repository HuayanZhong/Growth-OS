/**
 * Project 域 typed client（迭代计划 2.6 前端 feature 化）。
 *
 * 入参/返回类型全部派生自 packages/types 的 ProjectsApiMap 契约（复用 IPC 契约
 * 派生模式），本模块不重复声明业务类型；传输（token 注入、{ data } 信封解包、
 * ApiError 抛出）由 apiFetch 承担，这里只做路径拼接与契约桥接。
 */
import type { EndpointRequest, EndpointResponse, ProjectsApiMap } from '@growth-os/types'
import { apiFetch } from '~/composables/useApi'

/** 各端点契约的本地别名（key 与 ProjectsApiMap 一一对应） */
type ListProjects = ProjectsApiMap['GET /projects']
type GetProject = ProjectsApiMap['GET /projects/:id']
type CreateProject = ProjectsApiMap['POST /projects']
type UpdateProject = ProjectsApiMap['PATCH /projects/:id']
type DeleteProject = ProjectsApiMap['DELETE /projects/:id']

/**
 * Project 域 HTTP 客户端：ProjectsApiMap 的完整镜像。
 * 路径参数（:id）在此拼接进 path，不进入 request 类型。
 */
export const projectsApi = {
  /** GET /projects → Project[] */
  list: () => apiFetch<EndpointResponse<ListProjects>>('/projects'),
  /** GET /projects/:id → Project（无数据 404 → ApiError NOT_FOUND） */
  getById: (id: string) => apiFetch<EndpointResponse<GetProject>>(`/projects/${id}`),
  /** POST /projects → Project（骨架期写路径 501 NOT_IMPLEMENTED） */
  create: (input: EndpointRequest<CreateProject>) =>
    apiFetch<EndpointResponse<CreateProject>>('/projects', { method: 'POST', body: input }),
  /** PATCH /projects/:id → Project */
  update: (id: string, input: EndpointRequest<UpdateProject>) =>
    apiFetch<EndpointResponse<UpdateProject>>(`/projects/${id}`, { method: 'PATCH', body: input }),
  /** DELETE /projects/:id → 无业务数据（信封 {}，解包为 undefined） */
  remove: (id: string) =>
    apiFetch<EndpointResponse<DeleteProject>>(`/projects/${id}`, { method: 'DELETE' }),
}
