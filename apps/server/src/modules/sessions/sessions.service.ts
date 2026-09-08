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
import {
  SessionEventEntity,
  toSessionEvent,
  toSessionEventRow,
} from './entities/session-event.entity.ts'
import type { SessionEventRow } from './entities/session-event.entity.ts'
import {
  SessionRecordEntity,
  toSessionRecord,
  toSessionRecordRow,
} from './entities/session-record.entity.ts'
import { AuditService } from '../audit/audit.service.ts'

/** turn/step 边界事件：fork 的合法 boundary（BookkeepingEventType 的边界子集） */
const FORK_BOUNDARY_TYPES: ReadonlySet<string> = new Set([
  'turn_start',
  'turn_end',
  'step_start',
  'step_end',
])

/**
 * Session 域 service：会话记录 CRUD + 事件日志（唯一事实源）的 append-only
 * 存储与查询，实现 SessionEventLog 契约的 append/query/fork（deriveMessages
 * 投影由 @growth-os/shared 提供，"模型可见即已记录"的运行时断言在投影处生效）。
 *
 * 无 per-request EM（registerRequestContext: false），每次操作显式 fork 保证
 * EM 隔离；多写操作单 flush/事务保证原子性。
 */
@Injectable()
export class SessionsService {
  constructor(
    @InjectMikroORM('default')
    private readonly orm: MikroORM,
    /** 跨域审计（域间只走 service 注入）：写操作成功后记录审计日志 */
    private readonly auditService: AuditService,
  ) {}

  // ---- 会话记录 CRUD ----

  /** 会话列表（按更新时间倒序） */
  async list(): Promise<SessionRecord[]> {
    const em = this.orm.em.fork()
    const rows = await em.find(
      SessionRecordEntity,
      {},
      {
        orderBy: { updatedAt: QueryOrder.DESC },
      },
    )
    return rows.map(toSessionRecord)
  }

  async getById(id: string): Promise<SessionRecord> {
    const row = await this.orm.em.fork().findOne(SessionRecordEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '会话不存在' })
    }
    return toSessionRecord(row)
  }

  /** 非抛错读取（跨域消费方如 turn 管线自行处理缺失语义） */
  async findRecordById(id: string): Promise<SessionRecord | null> {
    const row = await this.orm.em.fork().findOne(SessionRecordEntity, { id })
    return row ? toSessionRecord(row) : null
  }

  async create(input: CreateSessionInput, actorId: string): Promise<SessionRecord> {
    const em = this.orm.em.fork()
    const now = Date.now()
    const record: SessionRecord = {
      id: crypto.randomUUID(),
      agentId: input.agentId,
      title: input.title ?? '新会话',
      createdAt: now,
      updatedAt: now,
    }
    em.persist(em.create(SessionRecordEntity, toSessionRecordRow(record)))
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'create',
      resourceType: 'session',
      resourceId: record.id,
      details: { title: record.title, agentId: record.agentId },
    })
    return record
  }

  async update(id: string, input: UpdateSessionInput, actorId: string): Promise<SessionRecord> {
    const em = this.orm.em.fork()
    const row = await em.findOne(SessionRecordEntity, { id })
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '会话不存在' })
    }
    if (input.title !== undefined) {
      row.title = input.title
      row.updatedAt = new Date()
    }
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'update',
      resourceType: 'session',
      resourceId: id,
      ...(input.title !== undefined ? { details: { title: input.title } } : {}),
    })
    return toSessionRecord(row)
  }

  /** 删除会话：记录、事件日志与审计同事务删除/写入（事件表无 FK，由 service 显式删） */
  async remove(id: string, actorId: string): Promise<void> {
    const em = this.orm.em.fork()
    await em.transactional(async (tem) => {
      const row = await tem.findOne(SessionRecordEntity, { id })
      if (!row) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: '会话不存在' })
      }
      tem.remove(row)
      await tem.nativeDelete(SessionEventEntity, { sessionId: id })
      await this.auditService.record(
        {
          actorId,
          action: 'delete',
          resourceType: 'session',
          resourceId: id,
          details: { title: row.title },
        },
        tem,
      )
    })
  }

  // ---- 事件日志（append-only） ----

  /** 追加事件（append-only）：重复 id 由 unique 约束在存储层拒绝 */
  async appendEvent(event: SessionEvent): Promise<void> {
    const em = this.orm.em.fork()
    // em.create 默认不进入持久化上下文，必须显式 persist 后 flush 才落库
    em.persist(em.create(SessionEventEntity, toSessionEventRow(event)))
    await em.flush()
  }

  /**
   * 从 turn/step 边界事件分叉新会话（SessionEventLog.fork 的服务端实现）：
   * 复制源会话 seq ≤ boundary 的全部事件（含 boundary）到新会话，并补插新
   * 会话记录，单 flush 单事务。事件行 id 重新生成（id 全局 unique），
   * payload 内的 callId 等关联保持不变。
   */
  async forkSession(
    sourceSessionId: string,
    boundaryEventId: string,
    actorId: string,
  ): Promise<ForkSessionResult> {
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
    // fork 产物补会话记录：源有记录 → 继承 agentId/title（加分叉标记）；
    // 源无记录（事件先于记录存在）→ agentId 从复制事件推导
    const sourceRecord = await em.findOne(SessionRecordEntity, { id: sourceSessionId })
    const agentId = sourceRecord?.agentId ?? rows.find((r) => r.agentId !== null)?.agentId ?? ''
    const title = sourceRecord ? `${sourceRecord.title}（分叉）` : '新会话（分叉）'
    const now = new Date()
    em.persist(
      em.create(SessionRecordEntity, {
        id: newSessionId,
        agentId,
        title,
        createdAt: now,
        updatedAt: now,
      }),
    )
    await em.flush()
    await this.auditService.record({
      actorId,
      action: 'fork',
      resourceType: 'session',
      resourceId: newSessionId,
      details: { sourceSessionId, boundaryEventId, copiedEvents: rows.length },
    })
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

  /** 会话事件序列（升序），即 GET /sessions/:id/events 的数据源 */
  async listEvents(id: string): Promise<SessionEvent[]> {
    return this.queryEvents({ sessionId: id })
  }

  /** 消息投影 = 事件序列跑 deriveMessages（模型可见即已记录）；投影失败即 5xx 暴露 */
  async listMessages(id: string): Promise<Message[]> {
    return deriveMessages(await this.listEvents(id))
  }
}
