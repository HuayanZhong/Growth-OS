import { Injectable } from '@nestjs/common'
import { MikroORM, QueryOrder } from '@mikro-orm/core'
import type { FilterQuery } from '@mikro-orm/core'
import { InjectMikroORM } from '@mikro-orm/nestjs'
import { deriveMessages } from '@growth-os/shared'
import type {
  EventFilter,
  Message,
  SessionEvent,
  SessionRecord,
  CreateSessionInput,
  UpdateSessionInput,
} from '@growth-os/types'
import { notImplemented } from '../../common/errors/not-implemented.ts'
import {
  SessionEventEntity,
  toSessionEvent,
  toSessionEventRow,
} from './entities/session-event.entity.ts'
import type { SessionEventRow } from './entities/session-event.entity.ts'

/**
 * Session 域 service：事件日志（唯一事实源）的 append-only 存储与查询，
 * 实现 SessionEventLog 契约的 append/query（deriveMessages 投影由
 * @growth-os/shared 提供，"模型可见即已记录"的运行时断言在投影处生效）。
 *
 * 会话记录 CRUD 仍是骨架（写路径 501），随会话生命周期落地；
 * fork/回放恢复在 3.2 落地。无 per-request EM（registerRequestContext: false），
 * 每次操作显式 fork 保证 EM 隔离。
 */
@Injectable()
export class SessionsService {
  constructor(
    @InjectMikroORM('default')
    private readonly orm: MikroORM,
  ) {}

  /** 追加事件（append-only）：重复 id 由 unique 约束在存储层拒绝 */
  async appendEvent(event: SessionEvent): Promise<void> {
    const em = this.orm.em.fork()
    em.create(SessionEventEntity, toSessionEventRow(event))
    await em.flush()
  }

  /** 事件查询：过滤条件（会话/Agent/类型/时间窗）+ 升序 + limit */
  async queryEvents(filter: EventFilter): Promise<SessionEvent[]> {
    const em = this.orm.em.fork()
    const where: FilterQuery<SessionEventRow> = {}
    if (filter.sessionId !== undefined) {
      where.sessionId = filter.sessionId
    }
    if (filter.agentId !== undefined) {
      where.agentId = filter.agentId
    }
    if (filter.type !== undefined) {
      where.type = filter.type
    }
    if (filter.from !== undefined || filter.to !== undefined) {
      where.timestamp = {
        ...(filter.from !== undefined ? { $gte: new Date(filter.from) } : {}),
        ...(filter.to !== undefined ? { $lte: new Date(filter.to) } : {}),
      }
    }
    const rows = await em.find(SessionEventEntity, where, {
      orderBy: { seq: QueryOrder.ASC },
      ...(filter.limit !== undefined ? { limit: filter.limit } : {}),
    })
    return rows.map(toSessionEvent)
  }

  list(): SessionRecord[] {
    return []
  }

  getById(_id: string): SessionRecord | null {
    return null
  }

  create(_input: CreateSessionInput): SessionRecord {
    throw notImplemented('创建会话')
  }

  update(_id: string, _input: UpdateSessionInput): SessionRecord {
    throw notImplemented('更新会话')
  }

  remove(_id: string): void {
    throw notImplemented('删除会话')
  }

  /** 会话事件序列（升序），即 GET /sessions/:id/events 的数据源 */
  async listEvents(id: string): Promise<SessionEvent[]> {
    return this.queryEvents({ sessionId: id })
  }

  /** 消息投影 = 事件序列跑 deriveMessages（模型可见即已记录）；投影失败即 5xx 暴露 */
  async listMessages(id: string): Promise<Message[]> {
    return deriveMessages(await this.listEvents(id))
  }
}
