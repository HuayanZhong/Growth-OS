import { defineEntity } from '@mikro-orm/core'
import type { InferEntity } from '@mikro-orm/core'
import type { Agent } from '@growth-os/types'

/**
 * Agent 目录表（server-agent-directory）。
 *
 * 目录以服务端为唯一数据源：内置默认 Agent 为迁移 seed 的全局共享行
 * （is_default = true，user_id 为空，对所有登录用户只读可见）；自定义
 * Agent 按 user_id 隔离（JWT sub）。slug 全局唯一，由服务端生成。
 */
export const AgentEntity = defineEntity({
  name: 'Agent',
  tableName: 'agents',
  properties: (p) => ({
    /** 应用层 UUID */
    id: p.text().primary(),
    /** 创建者用户 UUID（JWT sub）；默认 Agent seed 行为 null */
    userId: p.text().nullable(),
    slug: p.text().unique(),
    name: p.text(),
    emotion: p.text(),
    color: p.text().nullable(),
    description: p.text().nullable(),
    skills: p.json<string[]>().nullable(),
    isDefault: p.boolean().default(false),
    createdAt: p.datetime(),
  }),
  indexes: [{ properties: ['userId'] }],
})

/** agents 行类型 */
export type AgentRow = InferEntity<typeof AgentEntity>

/** agents 行 → 契约（null 可选字段不落回契约） */
export function toAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isDefault: row.isDefault,
    emotion: row.emotion,
    ...(row.color != null ? { color: row.color } : {}),
    ...(row.description != null ? { description: row.description } : {}),
    ...(row.skills != null ? { skills: row.skills } : {}),
  }
}
