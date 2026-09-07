import { Test } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { QueryOrder } from '@mikro-orm/core'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectionError } from '@growth-os/shared'
import type { EventFilter, SessionEvent, SessionRecord } from '@growth-os/types'
import { SessionsService } from '../../../src/modules/sessions/sessions.service.ts'
import { SessionEventEntity } from '../../../src/modules/sessions/entities/session-event.entity.ts'
import { SessionRecordEntity } from '../../../src/modules/sessions/entities/session-record.entity.ts'
import type {
  SessionEventInsert,
  SessionEventRow,
} from '../../../src/modules/sessions/entities/session-event.entity.ts'
import type { SessionRecordRow } from '../../../src/modules/sessions/entities/session-record.entity.ts'

/**
 * Session 域存储（会话记录 CRUD + SessionEventLog 契约的 append/query/fork 实现）。
 * EM 以 fork 后的假对象注入（绝不连真实 DB）；投影断言复用 @growth-os/shared 的
 * deriveMessages 行为——"模型可见即已记录"不变量在投影处生效。
 */
describe('SessionsService 存储与 fork', () => {
  const T0 = 1_700_000_000_000

  let service: SessionsService
  const fakeEm = {
    find: vi.fn<(entity: unknown, where?: unknown, options?: unknown) => Promise<unknown[]>>(),
    findOne: vi.fn<(entity: unknown, where?: unknown) => Promise<unknown>>(),
    create: vi.fn<(entity: unknown, data: unknown) => unknown>(),
    persist: vi.fn<(entity: unknown) => unknown>(),
    remove: vi.fn<(entity: unknown) => unknown>(),
    nativeDelete: vi.fn<(entity: unknown, where?: unknown) => Promise<number>>(),
    flush: vi.fn<() => Promise<void>>(),
    transactional: vi.fn<(cb: (em: unknown) => Promise<void>) => Promise<void>>(),
  }

  beforeEach(async () => {
    // reset 而非 clear：mockRejectedValue/mockResolvedValue 等实现必须一并重置，防止用例间泄漏
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

  function makeEventRow(over: Partial<SessionEventRow> = {}): SessionEventRow {
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

  function makeRecordRow(over: Partial<SessionRecordRow> = {}): SessionRecordRow {
    const base: SessionRecordRow = {
      id: 's1',
      agentId: 'a1',
      title: '会话',
      createdAt: new Date(T0),
      updatedAt: new Date(T0),
    }
    return Object.assign(base, over)
  }

  describe('会话记录 CRUD', () => {
    it('create：id/时间戳服务端生成，title 缺省「新会话」', async () => {
      const record = await service.create({ agentId: 'a1' })
      expect(record.agentId).toBe('a1')
      expect(record.title).toBe('新会话')
      expect(record.id).toMatch(/^[0-9a-f-]{36}$/)
      expect(fakeEm.create).toHaveBeenCalledWith(SessionRecordEntity, {
        id: record.id,
        agentId: 'a1',
        title: '新会话',
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      })
      expect(fakeEm.persist).toHaveBeenCalledTimes(1)
      expect(fakeEm.flush).toHaveBeenCalledTimes(1)
    })

    it('create：显式 title 透传', async () => {
      const record = await service.create({ agentId: 'a1', title: '自定义' })
      expect(record.title).toBe('自定义')
    })

    it('list：按 updatedAt 倒序，行映射为契约（epoch ms）', async () => {
      fakeEm.find.mockResolvedValue([
        makeRecordRow({ id: 's2', updatedAt: new Date(T0 + 5) }),
        makeRecordRow(),
      ])
      const records = await service.list()
      expect(fakeEm.find).toHaveBeenCalledWith(
        SessionRecordEntity,
        {},
        { orderBy: { updatedAt: QueryOrder.DESC } },
      )
      expect(records).toEqual([
        { id: 's2', agentId: 'a1', title: '会话', createdAt: T0, updatedAt: T0 + 5 },
        { id: 's1', agentId: 'a1', title: '会话', createdAt: T0, updatedAt: T0 },
      ])
    })

    it('getById：不存在抛 NotFoundException；存在映射为契约', async () => {
      fakeEm.findOne.mockResolvedValue(null)
      await expect(service.getById('missing')).rejects.toThrow(NotFoundException)

      fakeEm.findOne.mockResolvedValue(makeRecordRow())
      expect(await service.getById('s1')).toEqual({
        id: 's1',
        agentId: 'a1',
        title: '会话',
        createdAt: T0,
        updatedAt: T0,
      })
    })

    it('update：不存在 404；成功改 title 并刷新 updatedAt', async () => {
      fakeEm.findOne.mockResolvedValue(null)
      await expect(service.update('missing', { title: 'x' })).rejects.toThrow(NotFoundException)

      const row = makeRecordRow()
      fakeEm.findOne.mockResolvedValue(row)
      const result = await service.update('s1', { title: '新标题' })
      expect(result.title).toBe('新标题')
      expect(result.updatedAt).toBeGreaterThan(T0)
      expect(fakeEm.flush).toHaveBeenCalledTimes(1)
    })

    it('remove：事务内删记录并级联删事件；不存在 404', async () => {
      fakeEm.transactional.mockImplementation((cb) => cb(fakeEm))

      fakeEm.findOne.mockResolvedValue(null)
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException)

      const row = makeRecordRow()
      fakeEm.findOne.mockResolvedValue(row)
      await service.remove('s1')
      expect(fakeEm.remove).toHaveBeenCalledWith(row)
      expect(fakeEm.nativeDelete).toHaveBeenCalledWith(SessionEventEntity, { sessionId: 's1' })
    })
  })

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
    it('复制 seq ≤ boundary 的事件到新会话并补插会话记录（含 boundary，行 id 重生成）', async () => {
      const boundary = makeEventRow({ id: 'b1', type: 'turn_end', seq: 3 })
      // 第一次 findOne = boundary 查询；第二次 = 源会话记录（此处无记录）
      fakeEm.findOne.mockResolvedValueOnce(boundary).mockResolvedValueOnce(null)
      fakeEm.find.mockResolvedValue([
        makeEventRow({ seq: 1 }),
        makeEventRow({
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

      const persistedEvents = fakeEm.create.mock.calls
        .filter(([entity]) => entity === SessionEventEntity)
        .map(([, data]) => data) as SessionEventInsert[]
      expect(persistedEvents).toHaveLength(3)
      // 新会话 id 统一且不同于源
      const newSessionId = persistedEvents[0]?.sessionId
      expect(newSessionId).toBeDefined()
      expect(newSessionId).not.toBe('s1')
      expect(result.sessionId).toBe(newSessionId)
      expect(persistedEvents.every((d) => d.sessionId === newSessionId)).toBe(true)
      // 事件行 id 全部重生成（id 全局 unique）
      expect(persistedEvents.every((d) => !['e1', 'e2', 'b1'].includes(d.id))).toBe(true)
      // 原事件内容按序保留，boundary（turn_end）也被复制
      expect(persistedEvents.map((d) => d.type)).toEqual([
        'user_message',
        'assistant_message',
        'turn_end',
      ])
      expect(persistedEvents[1]?.agentId).toBe('a1')
      expect(persistedEvents[1]?.payload).toEqual({ content: 'yo' })
      expect(result.copiedEvents).toBe(3)

      // 源无记录：补插的记录 agentId 从复制事件推导，title 用缺省
      const persistedRecord = fakeEm.create.mock.calls.find(
        ([entity]) => entity === SessionRecordEntity,
      )?.[1] as SessionRecordRow
      expect(persistedRecord).toMatchObject({
        id: newSessionId,
        agentId: 'a1',
        title: '新会话（分叉）',
      })
    })

    it('源有会话记录：新记录继承 agentId 并加「（分叉）」标题', async () => {
      const boundary = makeEventRow({ id: 'b1', type: 'turn_start', seq: 1 })
      fakeEm.findOne
        .mockResolvedValueOnce(boundary)
        .mockResolvedValueOnce(makeRecordRow({ agentId: 'src-agent', title: '源标题' }))
      fakeEm.find.mockResolvedValue([boundary])

      const result = await service.forkSession('s1', 'b1')
      const persistedRecord = fakeEm.create.mock.calls.find(
        ([entity]) => entity === SessionRecordEntity,
      )?.[1] as SessionRecordRow
      expect(persistedRecord).toMatchObject({
        id: result.sessionId,
        agentId: 'src-agent',
        title: '源标题（分叉）',
      })
      expect(result.copiedEvents).toBe(1)
    })

    it('boundary 事件不存在（或不在源会话内）→ NotFoundException', async () => {
      fakeEm.findOne.mockResolvedValue(null)
      await expect(service.forkSession('s1', 'missing')).rejects.toThrow(NotFoundException)
      expect(fakeEm.flush).not.toHaveBeenCalled()
    })

    it('boundary 非 turn/step 边界事件 → BadRequestException', async () => {
      fakeEm.findOne.mockResolvedValue(makeEventRow({ id: 'u1', type: 'user_message', seq: 1 }))
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
        makeEventRow(),
        makeEventRow({
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
        makeEventRow({ id: 'e0', type: 'turn_start', payload: {} }),
        makeEventRow(),
        makeEventRow({
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
      fakeEm.find.mockResolvedValue([makeEventRow({ payload: {} })])
      await expect(service.listMessages('s1')).rejects.toThrow(ProjectionError)
    })
  })
})
