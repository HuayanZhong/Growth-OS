import { Injectable } from '@nestjs/common'
import { MikroORM, QueryOrder } from '@mikro-orm/core'
import type { EntityManager, FilterQuery } from '@mikro-orm/core'
import { InjectMikroORM } from '@mikro-orm/nestjs'
import { randomUUID } from 'node:crypto'
import type { AuditLog, AuditLogQuery } from '@growth-os/types'
import { AuditLogEntity, toAuditLog } from './entities/audit-log.entity.ts'
import type { AuditLogRow } from './entities/audit-log.entity.ts'

/** 审计记录入参（服务端各域写操作触发，无对外 POST 端点） */
export interface AuditEntry {
  actorId: string
  action: string
  resourceType: string
  resourceId: string
  details?: unknown
}

/**
 * 审计日志 service（迭代计划 3.4）：append-only 记录与过滤查询。
 * 各域写操作经 service 注入显式调用 record——审计失败向上传播（审计完整性
 * 优先于操作可用性；桌面单用户场景下取舍成立）。
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectMikroORM('default')
    private readonly orm: MikroORM,
  ) {}

  /**
   * 记录一条审计日志（append-only）。传入事务内 EM 时与调用方的业务写入
   * 同事务提交（审计与操作原子）；缺省时独立 fork EM 落库。
   */
  async record(entry: AuditEntry, em?: EntityManager): Promise<void> {
    const target = em ?? this.orm.em.fork()
    const data = {
      id: randomUUID(),
      actorId: entry.actorId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      timestamp: new Date(),
      details: entry.details ?? null,
    }
    target.persist(target.create(AuditLogEntity, data))
    await target.flush()
  }

  /** 审计日志查询：过滤（actor/action/resource/时间窗）+ 时间倒序 + limit */
  async query(filter: AuditLogQuery): Promise<AuditLog[]> {
    const em = this.orm.em.fork()
    const where: FilterQuery<AuditLogRow> = {}
    if (filter.actorId !== undefined) {
      where.actorId = filter.actorId
    }
    if (filter.action !== undefined) {
      where.action = filter.action
    }
    if (filter.resourceType !== undefined) {
      where.resourceType = filter.resourceType
    }
    if (filter.resourceId !== undefined) {
      where.resourceId = filter.resourceId
    }
    if (filter.from !== undefined || filter.to !== undefined) {
      where.timestamp = {
        ...(filter.from !== undefined ? { $gte: new Date(filter.from) } : {}),
        ...(filter.to !== undefined ? { $lte: new Date(filter.to) } : {}),
      }
    }
    const rows = await em.find(AuditLogEntity, where, {
      orderBy: { seq: QueryOrder.DESC },
      ...(filter.limit !== undefined ? { limit: filter.limit } : {}),
    })
    return rows.map(toAuditLog)
  }
}
