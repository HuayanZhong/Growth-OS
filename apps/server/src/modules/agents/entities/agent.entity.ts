import { defineEntity } from '@mikro-orm/core'
import type { InferEntity } from '@mikro-orm/core'
import type { Agent } from '@growth-os/types'

/**
 * Agent 表（迭代计划 2.6 领域地图：人设 + 模型 + 工具绑定的编排单元）。
 *
 * toolIds 是 id 引用列表（jsonb），Skill 域提供目录——聚合方式与 Project
 * 一致（引用而非快照/关联表），成员资源仍归各自域所有。
 */
export const AgentEntity = defineEntity({
  name: 'AgentRecord',
  tableName: 'agents',
  properties: (p) => ({
    id: p.text().primary(),
    name: p.text(),
    /** 人设/系统指令 */
    systemPrompt: p.text(),
    /** 模型标识（如 deepseek-chat），适配器层据此路由 */
    model: p.text(),
    /** 绑定的工具 id 列表（Skill 域目录的引用） */
    toolIds: p.json<string[]>(),
    description: p.text().nullable(),
    enabled: p.boolean(),
    /** epoch ms ↔ timestamptz(3) */
    createdAt: p.datetime(),
    updatedAt: p.datetime(),
  }),
  indexes: [{ properties: ['name'] }, { properties: ['updatedAt'] }],
})

/** agents 行类型 */
export type AgentRow = InferEntity<typeof AgentEntity>

/** 存储行 → Agent 契约（Date 转回 epoch ms，null description 不落回契约字段） */
export function toAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    systemPrompt: row.systemPrompt,
    model: row.model,
    toolIds: row.toolIds,
    ...(row.description != null ? { description: row.description } : {}),
    enabled: row.enabled,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }
}
