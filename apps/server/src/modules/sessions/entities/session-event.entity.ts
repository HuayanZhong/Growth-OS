import { defineEntity } from '@mikro-orm/core'
import type { InferEntity } from '@mikro-orm/core'
import type { SessionEvent } from '@growth-os/types'

/**
 * 会话事件表（迭代计划 3.1）：SessionEventLog 契约的 PostgreSQL 存储，append-only。
 *
 * 设计要点：
 * - seq 为插入序主键：回放顺序键，同毫秒事件的确定化 tiebreaker（timestamp 只做过滤）；
 * - id 对应 SessionEvent.id，unique 约束保证 append 幂等边界（重复追加在 DB 层失败）；
 * - timestamp 用 timestamptz(3)（毫秒精度，与 SessionEvent.timestamp 的 epoch ms 无损互转）；
 * - payload 用 jsonb；type 用 text——事件词汇表无运行时表示，类型收窄在投影处
 *   （deriveMessages 的词汇表漂移防护）兜底，不在此重复字面量数组造成漂移源。
 */
export const SessionEventEntity = defineEntity({
  name: 'SessionEvent',
  tableName: 'session_events',
  properties: (p) => ({
    /** 插入序（serial），回放顺序键 */
    seq: p.integer().primary().autoincrement(),
    /** 事件唯一 id（SessionEvent.id） */
    id: p.text().unique(),
    sessionId: p.text(),
    agentId: p.text().nullable(),
    type: p.text(),
    /** 事件时间：epoch ms ↔ timestamptz(3) */
    timestamp: p.datetime(),
    /** 按 SessionEvent.type 收窄的载荷（jsonb） */
    payload: p.json<unknown>(),
  }),
  indexes: [
    // 会话内按序取回的主查询路径（WHERE sessionId = ? ORDER BY seq）
    { properties: ['sessionId', 'seq'] },
    { properties: ['agentId'] },
    { properties: ['type'] },
    { properties: ['timestamp'] },
  ],
})

/** session_events 行类型 */
export type SessionEventRow = InferEntity<typeof SessionEventEntity>

/** session_events 待插入数据（seq 由 DB serial 生成，不在插入数据内） */
export interface SessionEventInsert {
  id: string
  sessionId: string
  agentId: string | null
  type: SessionEvent['type']
  timestamp: Date
  payload: unknown
}

/** SessionEvent（契约）→ 待插入数据：epoch ms 转 Date，缺省 agentId 归一为 null */
export function toSessionEventRow(event: SessionEvent): SessionEventInsert {
  return {
    id: event.id,
    sessionId: event.sessionId,
    agentId: event.agentId ?? null,
    type: event.type,
    timestamp: new Date(event.timestamp),
    payload: event.payload,
  }
}

/** 存储行 → SessionEvent（契约）：Date 转回 epoch ms，缺省 agentId 不落回契约字段 */
export function toSessionEvent(row: SessionEventRow): SessionEvent {
  return {
    id: row.id,
    // type 列为 text：词汇表收窄由投影处的漂移防护兜底
    type: row.type as SessionEvent['type'],
    timestamp: row.timestamp.getTime(),
    sessionId: row.sessionId,
    ...(row.agentId != null ? { agentId: row.agentId } : {}),
    payload: row.payload,
  }
}
