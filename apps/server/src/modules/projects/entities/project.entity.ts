import { defineEntity } from '@mikro-orm/core'
import type { InferEntity } from '@mikro-orm/core'
import type { Project } from '@growth-os/types'

/**
 * Project 表（领域地图：项目聚合根，串联 agent/session/skill/file 资源）。
 *
 * 聚合方式是 id 引用列表（jsonb，非快照拷贝/关联表）：成员资源仍归各自域
 * 所有，Project 只维护"哪些资源属于这个项目"；引用有效性在业务层校验。
 */
export const ProjectEntity = defineEntity({
  name: 'ProjectRecord',
  tableName: 'projects',
  properties: (p) => ({
    id: p.text().primary(),
    name: p.text(),
    description: p.text().nullable(),
    agentIds: p.json<string[]>(),
    sessionIds: p.json<string[]>(),
    skillIds: p.json<string[]>(),
    fileIds: p.json<string[]>(),
    /** epoch ms ↔ timestamptz(3) */
    createdAt: p.datetime(),
    updatedAt: p.datetime(),
  }),
  indexes: [{ properties: ['name'] }, { properties: ['updatedAt'] }],
})

/** projects 行类型 */
export type ProjectRow = InferEntity<typeof ProjectEntity>

/** 存储行 → Project 契约（Date 转回 epoch ms，null description 不落回契约字段） */
export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    ...(row.description != null ? { description: row.description } : {}),
    agentIds: row.agentIds,
    sessionIds: row.sessionIds,
    skillIds: row.skillIds,
    fileIds: row.fileIds,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }
}
