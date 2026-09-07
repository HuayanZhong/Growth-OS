import { defineEntity } from '@mikro-orm/core'
import type { InferEntity } from '@mikro-orm/core'
import type { AuditLog } from '@growth-os/types'

/**
 * 审计日志表（迭代计划 3.4）：append-only，复用会话事件日志的存储模式。
 *
 * 只追加不更新：审计的完整性优先，无 unique 幂等诉求（每次操作一行）；
 * 查询主路径是按时间倒序 + 过滤（actor/action/resource），索引覆盖。
 */
export const AuditLogEntity = defineEntity({
  name: 'AuditLog',
  tableName: 'audit_logs',
  properties: (p) => ({
    /** 插入序（serial）：同毫秒审计行的确定化 tiebreaker */
    seq: p.integer().primary().autoincrement(),
    /** 事件唯一 id（应用层 UUID） */
    id: p.text().unique(),
    /** 操作者用户 UUID（JWT sub） */
    actorId: p.text(),
    action: p.text(),
    resourceType: p.text(),
    resourceId: p.text(),
    /** epoch ms ↔ timestamptz(3) */
    timestamp: p.datetime(),
    /** 动作摘要（jsonb，可选） */
    details: p.json<unknown>().nullable(),
  }),
  indexes: [
    { properties: ['timestamp'] },
    { properties: ['actorId'] },
    { properties: ['resourceType', 'resourceId'] },
    { properties: ['action'] },
  ],
})

/** audit_logs 行类型 */
export type AuditLogRow = InferEntity<typeof AuditLogEntity>

/** 审计日志行 → 契约（Date 转回 epoch ms，null details 不落回契约字段） */
export function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    timestamp: row.timestamp.getTime(),
    ...(row.details != null ? { details: row.details } : {}),
  }
}
