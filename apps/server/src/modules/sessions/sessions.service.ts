import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { MikroORM, QueryOrder } from '@mikro-orm/core'
import type { FilterQuery } from '@mikro-orm/core'
import { InjectMikroORM } from '@mikro-orm/nestjs'
import { deriveMessages } from '@growth-os/shared'
import type {
  EventFilter,
  ForkSessionResult,
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

/** turn/step 边界事件：fork 的合法 boundary（BookkeepingEventType 的边界子集） */
const FORK_BOUNDARY_TYPES: ReadonlySet<string> = new Set([
  'turn_start',
  'turn_end',
  'step_start',
  'step_end',
])

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
    // em.create 默认不进入持久化上下文，必须显式 persist 后 flush 才落库
    em.persist(em.create(SessionEventEntity, toSessionEventRow(event)))
    await em.flush()
  }

  /**
   * 从 turn/step 边界事件分叉新会话（SessionEventLog.fork 的服务端实现）：
   * 复制源会话 seq ≤ boundary 的全部事件（含 boundary）到新会话，单 flush 单事务。
   * 事件行 id 重新生成（id 全局 unique），payload 内的 callId 等关联保持不变。
   */
  async forkSession(sourceSessionId: string, boundaryEventId: string): Promise<ForkSessionResult> {
    const em = this.orm.em.fork()
    const boundary = await em.findOne(SessionEventEntity, {
      id: boundaryEventId,
      sessionId: sourceSessionId,
    })
    if (!boundary) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '边界事件不存在' })
    }
    if (!FORK_BOUNDARY_TYPES.has(boundary.type)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `事件 ${boundaryEventId}（${boundary.type}）不是 turn/step 边界事件，不能作为 fork 边界`,
      })
    }
    const rows = await em.find(
      SessionEventEntity,
      { sessionId: sourceSessionId, seq: { $lte: boundary.seq } },
      { orderBy: { seq: QueryOrder.ASC } },
    )
    const newSessionId = crypto.randomUUID()
    for (const row of rows) {
      em.persist(
        em.create(SessionEventEntity, {
          id: crypto.randomUUID(),
          sessionId: newSessionId,
          agentId: row.agentId,
          type: row.type,
          timestamp: row.timestamp,
          payload: row.payload,
        }),
      )
    }
    await em.flush()
    return { sessionId: newSessionId, copiedEvents: rows.length }
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
