/**
 * Audit 域 HTTP 契约（迭代计划 3.4：操作审计日志）。
 *
 * 审计记录服务端管理操作的"谁（actor）/何时/对什么（资源）/做了什么（动作）"，
 * 落地为 append-only 的 audit_logs 表（复用会话事件日志的存储模式与响应信封）。
 * 记录端只由服务端各域写操作触发，无对外的 POST 端点；本契约只暴露查询。
 */
import { z } from 'zod'
import type { HttpEndpoint } from './http.ts'

/** AuditLog 的 schema：单条审计日志；details 为动作相关的开放结构 */
export const auditLogSchema = z.object({
  id: z.string(),
  /** 操作者用户 UUID（JWT sub） */
  actorId: z.string(),
  /** 动作：create / update / delete / fork（随域扩展） */
  action: z.string(),
  /** 资源类型：session / agent / file / ...（随域扩展） */
  resourceType: z.string(),
  /** 被操作资源 id；删除类操作为被删资源 id */
  resourceId: z.string(),
  /** epoch 毫秒 */
  timestamp: z.number().int(),
  /** 动作摘要（如 fork 的 boundaryEventId/copiedEvents、update 的字段名） */
  details: z.unknown().optional(),
})
export type AuditLog = z.infer<typeof auditLogSchema>

/** 审计日志查询条件（GET query，全部可选，时间为 epoch ms 闭区间；limit 上限 100） */
export const auditLogQuerySchema = z.object({
  actorId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>

export interface AuditApiMap {
  /** 审计日志列表（按时间倒序） */
  'GET /audit-logs': HttpEndpoint<'GET', AuditLogQuery, AuditLog[]>
}
