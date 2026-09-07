import { defineEntity } from '@mikro-orm/core'
import type { InferEntity } from '@mikro-orm/core'
import type { SessionRecord } from '@growth-os/types'

/**
 * 会话记录表：会话生命周期元数据（绑定 Agent、标题、时间戳）。
 *
 * 事件日志（session_events）是会话内容的事实源；本表只承载列表/索引所需的
 * 元数据。id 由应用层生成 UUID（fork 复制时新记录直接复用新会话 id）。
 * session_events.session_id 不建 FK 约束：事件 append 先于记录创建合法
 * （事件日志是唯一事实源），会话删除时由 service 显式级联删事件。
 */
export const SessionRecordEntity = defineEntity({
  name: 'SessionRecord',
  tableName: 'session_records',
  properties: (p) => ({
    id: p.text().primary(),
    agentId: p.text(),
    title: p.text(),
    /** epoch ms ↔ timestamptz(3) */
    createdAt: p.datetime(),
    updatedAt: p.datetime(),
  }),
  indexes: [{ properties: ['agentId'] }],
})

/** session_records 行类型 */
export type SessionRecordRow = InferEntity<typeof SessionRecordEntity>

/** 存储行 → SessionRecord（契约）：Date 转回 epoch ms */
export function toSessionRecord(row: SessionRecordRow): SessionRecord {
  return {
    id: row.id,
    agentId: row.agentId,
    title: row.title,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }
}

/** SessionRecord（契约）→ 待插入数据：epoch ms 转 Date */
export function toSessionRecordRow(record: SessionRecord): {
  id: string
  agentId: string
  title: string
  createdAt: Date
  updatedAt: Date
} {
  return {
    id: record.id,
    agentId: record.agentId,
    title: record.title,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  }
}
