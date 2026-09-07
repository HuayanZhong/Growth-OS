import { Injectable, NotFoundException } from '@nestjs/common'
import { MikroORM, QueryOrder } from '@mikro-orm/core'
import { InjectMikroORM } from '@mikro-orm/nestjs'
import { randomUUID } from 'node:crypto'
import type { CreateSkillInput, Skill, UpdateSkillInput } from '@growth-os/types'
import { AuditService } from '../audit/audit.service.ts'
import { SkillEntity, toSkill } from './entities/skill.entity.ts'

/**
 * Skill 域 service：CRUD 接 PostgreSQL 存储，写操作记审计（actor 来自 JWT）。
 * 无 per-request EM（registerRequestContext: false），每次操作显式 fork。
 */
@Injectable()
export class SkillsService {
  constructor(
    @InjectMikroORM('default')
    private readonly orm: MikroORM,
    private readonly auditService: AuditService,
  ) {}

  /** Skill 列表（按更新时间倒序） */
  async list(): Promise<Skill[]> {
    const em = this.orm.em.fork()
    const rows = await em.find(SkillEntity, {}, { orderBy: { updatedAt: QueryOrder.DESC } })
    return rows.map(toSkill)
  }

  async getById(id: string): Promise<Skill> {
    const row = await this.orm.em.fork().findOne(SkillEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Skill 不存在' })
    }
    return toSkill(row)
  }

  async create(input: CreateSkillInput, actorId: string): Promise<Skill> {
    const em = this.orm.em.fork()
    const now = Date.now()
    const skill: Skill = {
      id: randomUUID(),
      name: input.name,
      ...(input.description !== undefined ? { description: input.description } : {}),
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }
    em.persist(
      em.create(SkillEntity, {
        id: skill.id,
        name: skill.name,
        description: skill.description ?? null,
        enabled: skill.enabled,
        createdAt: new Date(skill.createdAt),
        updatedAt: new Date(skill.updatedAt),
      }),
    )
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'create',
      resourceType: 'skill',
      resourceId: skill.id,
      details: { name: skill.name },
    })
    return skill
  }

  async update(id: string, input: UpdateSkillInput, actorId: string): Promise<Skill> {
    const em = this.orm.em.fork()
    const row = await em.findOne(SkillEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Skill 不存在' })
    }
    if (input.name !== undefined) {
      row.name = input.name
    }
    if (input.description !== undefined) {
      row.description = input.description
    }
    if (input.enabled !== undefined) {
      row.enabled = input.enabled
    }
    row.updatedAt = new Date()
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'update',
      resourceType: 'skill',
      resourceId: id,
      details: { fields: Object.keys(input) },
    })
    return toSkill(row)
  }

  async remove(id: string, actorId: string): Promise<void> {
    const em = this.orm.em.fork()
    const row = await em.findOne(SkillEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Skill 不存在' })
    }
    em.remove(row)
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'delete',
      resourceType: 'skill',
      resourceId: id,
      details: { name: row.name },
    })
  }
}
