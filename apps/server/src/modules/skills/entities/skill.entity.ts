import { defineEntity } from '@mikro-orm/core'
import type { InferEntity } from '@mikro-orm/core'
import type { Skill } from '@growth-os/types'

/** Skill 表（领域地图：技能包注册、目录、启用状态；Agent.toolIds 引用本域 id） */
export const SkillEntity = defineEntity({
  name: 'SkillRecord',
  tableName: 'skills',
  properties: (p) => ({
    id: p.text().primary(),
    name: p.text(),
    description: p.text().nullable(),
    enabled: p.boolean(),
    /** epoch ms ↔ timestamptz(3) */
    createdAt: p.datetime(),
    updatedAt: p.datetime(),
  }),
  indexes: [{ properties: ['name'] }],
})

/** skills 行类型 */
export type SkillRow = InferEntity<typeof SkillEntity>

/** 存储行 → Skill 契约（Date 转回 epoch ms，null description 不落回契约字段） */
export function toSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    ...(row.description != null ? { description: row.description } : {}),
    enabled: row.enabled,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }
}
