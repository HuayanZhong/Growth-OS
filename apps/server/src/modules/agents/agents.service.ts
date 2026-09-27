import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { MikroORM, QueryOrder } from '@mikro-orm/core'
import { InjectMikroORM } from '@mikro-orm/nestjs'
import { randomUUID } from 'node:crypto'
import type { Agent, CreateAgentInput } from '@growth-os/types'
import { AgentEntity, toAgent } from './entities/agent.entity.ts'

/**
 * Agent 目录 service（server-agent-directory）：创建 / 列表 / 删除。
 * 目录以服务端为唯一数据源；默认 Agent（is_default seed 行）对所有登录用户
 * 只读可见，删除路径显式拒绝（403）。名称冲突域 = 默认 Agent + 本人自建
 * （409 AGENT_NAME_EXISTS）。
 *
 * 数据访问用 InjectMikroORM + 每操作 fork（与 audit 同构）：app.module 因
 * mikro-orm/nestjs@7.0.3-dev 的 per-request EM 缺陷关闭了 request context，
 * 全局 EM 的上下文操作被 v7 禁止（直接注入 repository/EntityManager 会抛
 * ValidationError），参考实现（nest-Aedium articles.service）的仓储直注风格
 * 须待 request context 复评重开后启用。
 */
@Injectable()
export class AgentsService {
  constructor(
    @InjectMikroORM('default')
    private readonly orm: MikroORM,
  ) {}

  /** 创建自定义 Agent：与默认 Agent 或本人已有 Agent 同名均 409；slug 服务端生成（冲突重生成） */
  async create(userId: string, input: CreateAgentInput): Promise<Agent> {
    const em = this.orm.em.fork()
    // 名称冲突域 = 默认 Agent（seed 行）+ 本人自建（他人自建同名不拦截）
    const clash = await em.findOne(AgentEntity, {
      name: input.name,
      $or: [{ isDefault: true }, { userId }],
    })
    if (clash) {
      throw new ConflictException({
        code: 'AGENT_NAME_EXISTS',
        message: '已存在同名 Agent，换个名字试试',
      })
    }
    for (;;) {
      const slug = `agent-${randomUUID().slice(0, 8)}`
      if (await em.findOne(AgentEntity, { slug })) continue
      const agent = em.create(AgentEntity, {
        id: randomUUID(),
        userId,
        slug,
        name: input.name,
        emotion: input.emotion,
        color: input.color ?? null,
        description: input.description ?? null,
        skills: input.skills ?? null,
        isDefault: false,
        createdAt: new Date(),
      })
      em.persist(agent)
      await em.flush()
      return toAgent(agent)
    }
  }

  /** 目录列表：默认 Agent（seed 行）在前，其后本人自建按创建时间升序 */
  async list(userId: string): Promise<Agent[]> {
    const em = this.orm.em.fork()
    const rows = await em.find(
      AgentEntity,
      { $or: [{ isDefault: true }, { userId }] },
      { orderBy: { isDefault: QueryOrder.DESC, createdAt: QueryOrder.ASC } },
    )
    return rows.map(toAgent)
  }

  /**
   * 删除自定义 Agent（按主键 id）：仅本人自建可删。默认行拒绝（403，公开可见
   * 信息，无泄露问题）；他人/不存在统一 404（不泄露资源存在性）。
   */
  async remove(userId: string, id: string): Promise<void> {
    const em = this.orm.em.fork()
    const row = await em.findOne(AgentEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'AGENT_NOT_FOUND', message: 'Agent 不存在' })
    }
    if (row.isDefault) {
      throw new ForbiddenException({
        code: 'AGENT_DEFAULT_IMMUTABLE',
        message: '默认 Agent 不可删除',
      })
    }
    if (row.userId !== userId) {
      throw new NotFoundException({ code: 'AGENT_NOT_FOUND', message: 'Agent 不存在' })
    }
    em.remove(row)
    await em.flush()
  }
}
