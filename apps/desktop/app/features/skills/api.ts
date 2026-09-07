/**
 * Skill 域 typed client（迭代计划 2.6 前端 feature 化）。
 *
 * 入参/返回类型全部派生自 packages/types 的 SkillsApiMap 契约（复用 IPC 契约
 * 派生模式），本模块不重复声明业务类型；传输（token 注入、{ data } 信封解包、
 * ApiError 抛出）由 apiFetch 承担，这里只做路径拼接与契约桥接。
 */
import type { EndpointRequest, EndpointResponse, SkillsApiMap } from '@growth-os/types'
import { apiFetch } from '~/composables/useApi'

/** 各端点契约的本地别名（key 与 SkillsApiMap 一一对应） */
type ListSkills = SkillsApiMap['GET /skills']
type GetSkill = SkillsApiMap['GET /skills/:id']
type CreateSkill = SkillsApiMap['POST /skills']
type UpdateSkill = SkillsApiMap['PATCH /skills/:id']
type DeleteSkill = SkillsApiMap['DELETE /skills/:id']

/**
 * Skill 域 HTTP 客户端：SkillsApiMap 的完整镜像。
 * 路径参数（:id）在此拼接进 path，不进入 request 类型。
 */
export const skillsApi = {
  /** GET /skills → Skill[] */
  list: () => apiFetch<EndpointResponse<ListSkills>>('/skills'),
  /** GET /skills/:id → Skill（无数据 404 → ApiError NOT_FOUND） */
  getById: (id: string) => apiFetch<EndpointResponse<GetSkill>>(`/skills/${id}`),
  /** POST /skills → Skill（骨架期写路径 501 NOT_IMPLEMENTED） */
  create: (input: EndpointRequest<CreateSkill>) =>
    apiFetch<EndpointResponse<CreateSkill>>('/skills', { method: 'POST', body: input }),
  /** PATCH /skills/:id → Skill */
  update: (id: string, input: EndpointRequest<UpdateSkill>) =>
    apiFetch<EndpointResponse<UpdateSkill>>(`/skills/${id}`, { method: 'PATCH', body: input }),
  /** DELETE /skills/:id → 无业务数据（信封 {}，解包为 undefined） */
  remove: (id: string) =>
    apiFetch<EndpointResponse<DeleteSkill>>(`/skills/${id}`, { method: 'DELETE' }),
}
