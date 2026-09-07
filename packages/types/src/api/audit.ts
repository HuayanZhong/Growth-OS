/**
 * Audit 域 HTTP 契约（迭代计划 3.4：操作审计日志）。
 *
 * 审计记录服务端管理操作的"谁（actor）/何时/对什么（资源）/做了什么（动作）"，
 * 落地为 append-only 的 audit_logs 表（复用会话事件日志的存储模式与响应信封）。
 * 记录端只由服务端各域写操作触发，无对外的 POST 端点；本契约只暴露查询。
 */
import type { HttpEndpoint } from './http.ts'

/** 单条审计日志 */
export interface AuditLog {
  id: string
  /** 操作者用户 UUID（JWT sub） */
  actorId: string
  /** 动作：create / update / delete / fork（随域扩展） */
  action: string
  /** 资源类型：session / agent / file / ...（随域扩展） */
  resourceType: string
  /** 被操作资源 id；删除类操作为被删资源 id */
  resourceId: string
  /** epoch 毫秒 */
  timestamp: number
  /** 动作摘要（如 fork 的 boundaryEventId/copiedEvents、update 的字段名） */
  details?: unknown
}

/** 审计日志查询条件（GET query，全部可选，时间为 epoch ms 闭区间） */
export interface AuditLogQuery {
  actorId?: string
  action?: string
  resourceType?: string
  resourceId?: string
  from?: number
  to?: number
  limit?: number
}

export interface AuditApiMap {
  /** 审计日志列表（按时间倒序） */
  'GET /audit-logs': HttpEndpoint<'GET', AuditLogQuery, AuditLog[]>
}
