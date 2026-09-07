import { Injectable, NotFoundException } from '@nestjs/common'
import { MikroORM, QueryOrder } from '@mikro-orm/core'
import { InjectMikroORM } from '@mikro-orm/nestjs'
import { randomUUID } from 'node:crypto'
import type { CreateProjectInput, Project, UpdateProjectInput } from '@growth-os/types'
import { AuditService } from '../audit/audit.service.ts'
import { ProjectEntity, toProject } from './entities/project.entity.ts'

/**
 * Project 域 service：CRUD 接 PostgreSQL 存储，写操作记审计（actor 来自 JWT）。
 * 无 per-request EM（registerRequestContext: false），每次操作显式 fork。
 */
@Injectable()
export class ProjectsService {
  constructor(
    @InjectMikroORM('default')
    private readonly orm: MikroORM,
    private readonly auditService: AuditService,
  ) {}

  /** Project 列表（按更新时间倒序） */
  async list(): Promise<Project[]> {
    const em = this.orm.em.fork()
    const rows = await em.find(ProjectEntity, {}, { orderBy: { updatedAt: QueryOrder.DESC } })
    return rows.map(toProject)
  }

  async getById(id: string): Promise<Project> {
    const row = await this.orm.em.fork().findOne(ProjectEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '项目不存在' })
    }
    return toProject(row)
  }

  async create(input: CreateProjectInput, actorId: string): Promise<Project> {
    const em = this.orm.em.fork()
    const now = Date.now()
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      ...(input.description !== undefined ? { description: input.description } : {}),
      agentIds: input.agentIds ?? [],
      sessionIds: input.sessionIds ?? [],
      skillIds: input.skillIds ?? [],
      fileIds: input.fileIds ?? [],
      createdAt: now,
      updatedAt: now,
    }
    em.persist(
      em.create(ProjectEntity, {
        id: project.id,
        name: project.name,
        description: project.description ?? null,
        agentIds: project.agentIds,
        sessionIds: project.sessionIds,
        skillIds: project.skillIds,
        fileIds: project.fileIds,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
      }),
    )
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'create',
      resourceType: 'project',
      resourceId: project.id,
      details: { name: project.name },
    })
    return project
  }

  async update(id: string, input: UpdateProjectInput, actorId: string): Promise<Project> {
    const em = this.orm.em.fork()
    const row = await em.findOne(ProjectEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '项目不存在' })
    }
    if (input.name !== undefined) {
      row.name = input.name
    }
    if (input.description !== undefined) {
      row.description = input.description
    }
    if (input.agentIds !== undefined) {
      row.agentIds = input.agentIds
    }
    if (input.sessionIds !== undefined) {
      row.sessionIds = input.sessionIds
    }
    if (input.skillIds !== undefined) {
      row.skillIds = input.skillIds
    }
    if (input.fileIds !== undefined) {
      row.fileIds = input.fileIds
    }
    row.updatedAt = new Date()
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'update',
      resourceType: 'project',
      resourceId: id,
      details: { fields: Object.keys(input) },
    })
    return toProject(row)
  }

  async remove(id: string, actorId: string): Promise<void> {
    const em = this.orm.em.fork()
    const row = await em.findOne(ProjectEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '项目不存在' })
    }
    em.remove(row)
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'delete',
      resourceType: 'project',
      resourceId: id,
      details: { name: row.name },
    })
  }
}
