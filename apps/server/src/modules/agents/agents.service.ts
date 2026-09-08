import { Injectable, NotFoundException } from '@nestjs/common'
import { MikroORM, QueryOrder } from '@mikro-orm/core'
import { InjectMikroORM } from '@mikro-orm/nestjs'
import { randomUUID } from 'node:crypto'
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@growth-os/types'
import { AuditService } from '../audit/audit.service.ts'
import { AgentEntity, toAgent } from './entities/agent.entity.ts'
import type { AgentRow } from './entities/agent.entity.ts'

/**
 * Agent 域 service：CRUD 接 PostgreSQL 存储，写操作记审计（actor 来自 JWT）。
 * 无 per-request EM（registerRequestContext: false），每次操作显式 fork。
 */
@Injectable()
export class AgentsService {
  constructor(
    @InjectMikroORM('default')
    private readonly orm: MikroORM,
    private readonly auditService: AuditService,
  ) {}

  /** Agent 列表（按更新时间倒序） */
  async list(): Promise<Agent[]> {
    const em = this.orm.em.fork()
    const rows = await em.find(AgentEntity, {}, { orderBy: { updatedAt: QueryOrder.DESC } })
    return rows.map(toAgent)
  }

  async getById(id: string): Promise<Agent> {
    const agent = await this.findById(id)
    if (!agent) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Agent 不存在' })
    }
    return agent
  }

  /** 非抛错读取（跨域消费方如 turn 管线自行处理缺失语义） */
  async findById(id: string): Promise<Agent | null> {
    const row = await this.orm.em.fork().findOne(AgentEntity, { id })
    return row ? toAgent(row) : null
  }

  async create(input: CreateAgentInput, actorId: string): Promise<Agent> {
    const em = this.orm.em.fork()
    const now = Date.now()
    const agent: Agent = {
      id: randomUUID(),
      name: input.name,
      systemPrompt: input.systemPrompt,
      model: input.model,
      toolIds: input.toolIds ?? [],
      ...(input.description !== undefined ? { description: input.description } : {}),
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }
    em.persist(
      em.create(AgentEntity, {
        id: agent.id,
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        model: agent.model,
        toolIds: agent.toolIds,
        description: agent.description ?? null,
        enabled: agent.enabled,
        createdAt: new Date(agent.createdAt),
        updatedAt: new Date(agent.updatedAt),
      }),
    )
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'create',
      resourceType: 'agent',
      resourceId: agent.id,
      details: { name: agent.name, model: agent.model },
    })
    return agent
  }

  async update(id: string, input: UpdateAgentInput, actorId: string): Promise<Agent> {
    const em = this.orm.em.fork()
    const row = await em.findOne(AgentEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Agent 不存在' })
    }
    if (input.name !== undefined) {
      row.name = input.name
    }
    if (input.systemPrompt !== undefined) {
      row.systemPrompt = input.systemPrompt
    }
    if (input.model !== undefined) {
      row.model = input.model
    }
    if (input.toolIds !== undefined) {
      row.toolIds = input.toolIds
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
      resourceType: 'agent',
      resourceId: id,
      details: { fields: Object.keys(input) },
    })
    return toAgent(row)
  }

  async remove(id: string, actorId: string): Promise<void> {
    const em = this.orm.em.fork()
    const row: AgentRow | null = await em.findOne(AgentEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Agent 不存在' })
    }
    em.remove(row)
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'delete',
      resourceType: 'agent',
      resourceId: id,
      details: { name: row.name },
    })
  }
}
