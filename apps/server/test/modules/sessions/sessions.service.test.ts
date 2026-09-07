import { Test } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { QueryOrder } from '@mikro-orm/core'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectionError } from '@growth-os/shared'
import type { EventFilter, SessionEvent } from '@growth-os/types'
import { SessionsService } from '../../../src/modules/sessions/sessions.service.ts'
import { SessionEventEntity } from '../../../src/modules/sessions/entities/session-event.entity.ts'
import type {
  SessionEventInsert,
  SessionEventRow,
} from '../../../src/modules/sessions/entities/session-event.entity.ts'

/**
 * Session 域事件存储（SessionEventLog 契约的 append/query 实现）。
 * EM 以 fork 后的假对象注入（绝不连真实 DB）；投影断言复用 @growth-os/shared 的
 * deriveMessages 行为——"模型可见即已记录"不变量在投影处生效。
 */
describe('SessionsService 事件存储', () => {
  const T0 = 1_700_000_000_000

  let service: SessionsService
  const fakeEm = {
    find: vi.fn<() => Promise<SessionEventRow[]>>(),
    findOne: vi.fn<() => Promise<SessionEventRow | null>>(),
    create: vi.fn<(entity: unknown, data: SessionEventInsert) => unknown>(),
    persist: vi.fn<(entity: unknown) => unknown>(),
    flush: vi.fn<() => Promise<void>>(),
  }

  beforeEach(async () => {
    // reset 而非 clear：mockRejectedValue 等实现必须一并重置，防止用例间泄漏
    vi.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: getMikroORMToken('default'),
          useValue: { em: { fork: () => fakeEm } },
        },
      ],
    }).compile()
    service = moduleRef.get(SessionsService)
  })

  function makeEvent(over: Partial<SessionEvent> = {}): SessionEvent {
    return {
      id: 'e1',
      type: 'user_message',
      timestamp: T0,
      sessionId: 's1',
      payload: { content: 'hi' },
      ...over,
    }
  }

  function makeRow(over: Partial<SessionEventRow> = {}): SessionEventRow {
    const base: SessionEventRow = {
      seq: 1,
      id: 'e1',
      sessionId: 's1',
      agentId: null,
      type: 'user_message',
      timestamp: new Date(T0),
      payload: { content: 'hi' },
    }
    return Object.assign(base, over)
  }

  describe('appendEvent（append-only）', () => {
    it('持久化映射数据：epoch ms 转 Date，缺省 agentId 归一为 null', async () => {
      const created = { marker: 'entity' }
      fakeEm.create.mockReturnValue(created)
      await service.appendEvent(makeEvent())
      expect(fakeEm.create).toHaveBeenCalledWith(SessionEventEntity, {
        id: 'e1',
        sessionId: 's1',
        agentId: null,
        type: 'user_message',
        timestamp: new Date(T0),
        payload: { content: 'hi' },
      })
      expect(fakeEm.persist).toHaveBeenCalledWith(created)
      expect(fakeEm.flush).toHaveBeenCalledTimes(1)
    })

    it('重复 id 由 unique 约束在存储层拒绝，错误向上传播', async () => {
      fakeEm.flush.mockRejectedValue(
        new Error('duplicate key value violates unique constraint "session_events_id_unique"'),
      )
      await expect(service.appendEvent(makeEvent())).rejects.toThrow(/duplicate key/)
    })
  })

  describe('forkSession（回放与分叉）', () => {
    it('从 turn/step 边界复制 seq ≤ boundary 的事件到新会话（含 boundary，行 id 重生成）', async () => {
      const boundary = makeRow({ id: 'b1', type: 'turn_end', seq: 3 })
      fakeEm.findOne.mockResolvedValue(boundary)
      fakeEm.find.mockResolvedValue([
        makeRow({ seq: 1 }),
        makeRow({
          id: 'e2',
          seq: 2,
          agentId: 'a1',
          type: 'assistant_message',
          timestamp: new Date(T0 + 5),
          payload: { content: 'yo' },
        }),
        boundary,
      ])

      const result = await service.forkSession('s1', 'b1')

      // boundary 定位限定在源会话内
      expect(fakeEm.findOne).toHaveBeenCalledWith(SessionEventEntity, {
        id: 'b1',
        sessionId: 's1',
      })
      // 复制范围按 seq 截断查询，升序
      expect(fakeEm.find).toHaveBeenCalledWith(
        SessionEventEntity,
        { sessionId: 's1', seq: { $lte: 3 } },
        { orderBy: { seq: QueryOrder.ASC } },
      )
      expect(fakeEm.flush).toHaveBeenCalledTimes(1)

      const persisted = fakeEm.create.mock.calls.map(([, data]) => data)
      expect(persisted).toHaveLength(3)
      // 新会话 id 统一且不同于源
      const newSessionId = persisted[0]?.sessionId
      expect(newSessionId).toBeDefined()
      expect(newSessionId).not.toBe('s1')
      expect(result.sessionId).toBe(newSessionId)
      expect(persisted.every((d) => d.sessionId === newSessionId)).toBe(true)
      // 事件行 id 全部重生成（id 全局 unique）
      expect(persisted.every((d) => !['e1', 'e2', 'b1'].includes(d.id))).toBe(true)
      // 原事件内容按序保留，boundary（turn_end）也被复制
      expect(persisted.map((d) => d.type)).toEqual([
        'user_message',
        'assistant_message',
        'turn_end',
      ])
      expect(persisted[1]?.agentId).toBe('a1')
      expect(persisted[1]?.payload).toEqual({ content: 'yo' })
      expect(result.copiedEvents).toBe(3)
    })

    it('boundary 事件不存在（或不在源会话内）→ NotFoundException', async () => {
      fakeEm.findOne.mockResolvedValue(null)
      await expect(service.forkSession('s1', 'missing')).rejects.toThrow(NotFoundException)
      expect(fakeEm.flush).not.toHaveBeenCalled()
    })

    it('boundary 非 turn/step 边界事件 → BadRequestException', async () => {
      fakeEm.findOne.mockResolvedValue(makeRow({ id: 'u1', type: 'user_message', seq: 1 }))
      await expect(service.forkSession('s1', 'u1')).rejects.toThrow(BadRequestException)
      expect(fakeEm.flush).not.toHaveBeenCalled()
    })
  })

  describe('queryEvents（查询与过滤）', () => {
    it('全量过滤条件映射为 where（时间窗为 Date 闭区间）+ seq 升序 + limit', async () => {
      fakeEm.find.mockResolvedValue([])
      const filter: EventFilter = {
        sessionId: 's1',
        agentId: 'a1',
        type: 'user_message',
        from: T0,
        to: T0 + 1_000,
        limit: 10,
      }
      await service.queryEvents(filter)
      expect(fakeEm.find).toHaveBeenCalledWith(
        SessionEventEntity,
        {
          sessionId: 's1',
          agentId: 'a1',
          type: 'user_message',
          timestamp: { $gte: new Date(T0), $lte: new Date(T0 + 1_000) },
        },
        { orderBy: { seq: QueryOrder.ASC }, limit: 10 },
      )
    })

    it('无过滤条件时查询全表，limit 缺省不进入查询选项', async () => {
      fakeEm.find.mockResolvedValue([])
      await service.queryEvents({})
      expect(fakeEm.find).toHaveBeenCalledWith(
        SessionEventEntity,
        {},
        { orderBy: { seq: QueryOrder.ASC } },
      )
    })

    it('行 → 契约事件：Date 转回 epoch ms，null agentId 不落回契约字段', async () => {
      fakeEm.find.mockResolvedValue([
        makeRow(),
        makeRow({
          id: 'e2',
          agentId: 'a1',
          type: 'assistant_message',
          timestamp: new Date(T0 + 5),
          payload: { content: 'yo' },
        }),
      ])
      expect(await service.listEvents('s1')).toEqual([
        {
          id: 'e1',
          type: 'user_message',
          timestamp: T0,
          sessionId: 's1',
          payload: { content: 'hi' },
        },
        {
          id: 'e2',
          type: 'assistant_message',
          timestamp: T0 + 5,
          sessionId: 's1',
          agentId: 'a1',
          payload: { content: 'yo' },
        },
      ])
    })
  })

  describe('listMessages（消息投影）', () => {
    it('对事件序列跑投影：簿记事件不进历史，只投影模型可见消息', async () => {
      fakeEm.find.mockResolvedValue([
        makeRow({ id: 'e0', type: 'turn_start', payload: {} }),
        makeRow(),
        makeRow({
          id: 'e2',
          agentId: 'a1',
          type: 'assistant_message',
          timestamp: new Date(T0 + 5),
          payload: { content: 'yo' },
        }),
      ])
      expect(await service.listMessages('s1')).toEqual([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'yo' },
      ])
    })

    it('投影失败（模型可见内容不可重建）时 ProjectionError 向上传播', async () => {
      fakeEm.find.mockResolvedValue([makeRow({ payload: {} })])
      await expect(service.listMessages('s1')).rejects.toThrow(ProjectionError)
    })
  })
})
