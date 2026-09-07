import { Test } from '@nestjs/testing'
import { QueryOrder } from '@mikro-orm/core'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditService } from '../../../src/modules/audit/audit.service.ts'
import { AuditLogEntity } from '../../../src/modules/audit/entities/audit-log.entity.ts'
import type { AuditLogRow } from '../../../src/modules/audit/entities/audit-log.entity.ts'

/**
 * 审计日志 service：append-only 记录与过滤查询（EM 以 fork 后假对象注入）。
 */
describe('AuditService', () => {
  const T0 = 1_700_000_000_000

  let service: AuditService
  const fakeEm = {
    find: vi.fn<(entity: unknown, where?: unknown, options?: unknown) => Promise<unknown[]>>(),
    create: vi.fn<(entity: unknown, data: unknown) => unknown>(),
    persist: vi.fn<(entity: unknown) => unknown>(),
    flush: vi.fn<() => Promise<void>>(),
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getMikroORMToken('default'),
          useValue: { em: { fork: () => fakeEm } },
        },
      ],
    }).compile()
    service = moduleRef.get(AuditService)
  })

  function makeRow(over: Partial<AuditLogRow> = {}): AuditLogRow {
    const base: AuditLogRow = {
      seq: 1,
      id: 'a1',
      actorId: 'user-1',
      action: 'create',
      resourceType: 'session',
      resourceId: 's1',
      timestamp: new Date(T0),
      details: { title: '新会话' },
    }
    return Object.assign(base, over)
  }

  describe('record', () => {
    it('生成 id/时间戳并持久化', async () => {
      await service.record({
        actorId: 'user-1',
        action: 'create',
        resourceType: 'session',
        resourceId: 's1',
        details: { title: 'x' },
      })
      expect(fakeEm.create).toHaveBeenCalledTimes(1)
      const [, data] = fakeEm.create.mock.calls[0]!
      expect(data).toMatchObject({
        actorId: 'user-1',
        action: 'create',
        resourceType: 'session',
        resourceId: 's1',
        details: { title: 'x' },
      })
      expect(fakeEm.flush).toHaveBeenCalledTimes(1)
    })

    it('details 缺省落 null', async () => {
      await service.record({
        actorId: 'user-1',
        action: 'delete',
        resourceType: 'session',
        resourceId: 's1',
      })
      const [, data] = fakeEm.create.mock.calls[0]!
      expect(data).toMatchObject({ details: null })
    })
  })

  describe('query', () => {
    it('过滤条件映射为 where（时间窗 Date 闭区间）+ seq 倒序 + limit', async () => {
      fakeEm.find.mockResolvedValue([])
      await service.query({
        actorId: 'user-1',
        action: 'fork',
        resourceType: 'session',
        resourceId: 's1',
        from: T0,
        to: T0 + 1_000,
        limit: 5,
      })
      expect(fakeEm.find).toHaveBeenCalledWith(
        AuditLogEntity,
        {
          actorId: 'user-1',
          action: 'fork',
          resourceType: 'session',
          resourceId: 's1',
          timestamp: { $gte: new Date(T0), $lte: new Date(T0 + 1_000) },
        },
        { orderBy: { seq: QueryOrder.DESC }, limit: 5 },
      )
    })

    it('行 → 契约：Date 转回 epoch ms，null details 不落回契约字段', async () => {
      fakeEm.find.mockResolvedValue([
        makeRow(),
        makeRow({ id: 'a2', details: null, action: 'update' }),
      ])
      const logs = await service.query({})
      expect(logs).toEqual([
        {
          id: 'a1',
          actorId: 'user-1',
          action: 'create',
          resourceType: 'session',
          resourceId: 's1',
          timestamp: T0,
          details: { title: '新会话' },
        },
        {
          id: 'a2',
          actorId: 'user-1',
          action: 'update',
          resourceType: 'session',
          resourceId: 's1',
          timestamp: T0,
        },
      ])
    })
  })
})
