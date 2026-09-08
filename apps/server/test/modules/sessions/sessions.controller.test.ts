import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditService } from '../../../src/modules/audit/audit.service.ts'
import { SessionsController } from '../../../src/modules/sessions/sessions.controller.ts'
import { SessionsService } from '../../../src/modules/sessions/sessions.service.ts'
import { TurnService } from '../../../src/modules/sessions/turn.service.ts'

/**
 * Session 域端点走真实 service（EM 以假对象注入，绝不连真实 DB）：
 * 空态返回空序列/404，事件与消息投影为空历史，fork 透传 service。
 */
describe('SessionsController', () => {
  let controller: SessionsController
  let fakeEm: {
    find: ReturnType<typeof vi.fn<() => Promise<unknown[]>>>
    findOne: ReturnType<typeof vi.fn<() => Promise<unknown>>>
    create: ReturnType<typeof vi.fn<(entity: unknown, data: unknown) => unknown>>
    persist: ReturnType<typeof vi.fn<(entity: unknown) => unknown>>
    remove: ReturnType<typeof vi.fn<(entity: unknown) => unknown>>
    nativeDelete: ReturnType<typeof vi.fn<() => Promise<number>>>
    flush: ReturnType<typeof vi.fn<() => Promise<void>>>
    transactional: ReturnType<typeof vi.fn<(cb: (em: unknown) => Promise<void>) => Promise<void>>>
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    fakeEm = {
      find: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      findOne: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
      create: vi.fn<(entity: unknown, data: unknown) => unknown>(),
      persist: vi.fn<(entity: unknown) => unknown>(),
      remove: vi.fn<(entity: unknown) => unknown>(),
      nativeDelete: vi.fn<() => Promise<number>>().mockResolvedValue(0),
      flush: vi.fn<() => Promise<void>>(),
      transactional: vi.fn<(cb: (em: unknown) => Promise<void>) => Promise<void>>(),
    }
    fakeEm.transactional.mockImplementation((cb) => cb(fakeEm))
    const moduleRef = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        SessionsService,
        {
          provide: TurnService,
          useValue: {
            execute: vi
              .fn<
                (
                  id: string,
                  input: { content: string },
                ) => Promise<{ eventIds: string[]; reply: { role: 'assistant'; content: string } }>
              >()
              .mockResolvedValue({
                eventIds: ['e1', 'e2', 'e3', 'e4'],
                reply: { role: 'assistant', content: '回复' },
              }),
          },
        },
        {
          provide: AuditService,
          useValue: { record: vi.fn<(entry: unknown) => Promise<void>>() },
        },
        {
          provide: getMikroORMToken('default'),
          useValue: { em: { fork: () => fakeEm } },
        },
      ],
    }).compile()
    controller = moduleRef.get(SessionsController)
  })

  it('列表为空，事件序列与消息投影为空历史', async () => {
    expect(await controller.list()).toEqual([])
    expect(await controller.listEvents('s1')).toEqual([])
    expect(await controller.listMessages('s1')).toEqual([])
  })

  it('详情不存在抛 NotFoundException', async () => {
    await expect(controller.get('s1')).rejects.toThrow(NotFoundException)
  })

  it('create 透传 service：返回服务端生成的记录（actor 来自 JWT）', async () => {
    const record = await controller.create(
      { agentId: 'a1' },
      { id: 'user-1', role: 'authenticated' },
    )
    expect(record.agentId).toBe('a1')
    expect(record.title).toBe('新会话')
    expect(fakeEm.flush).toHaveBeenCalledTimes(1)
  })

  it('send 透传 TurnService：返回回合结果', async () => {
    const result = await controller.send('s1', { content: '你好' })
    expect(result.reply).toEqual({ role: 'assistant', content: '回复' })
    expect(result.eventIds).toHaveLength(4)
  })

  it('fork 透传 service：boundary 不存在时 404', async () => {
    await expect(
      controller.fork(
        's1',
        { boundaryEventId: 'missing' },
        { id: 'user-1', role: 'authenticated' },
      ),
    ).rejects.toThrow(NotFoundException)
  })

  it('remove 不存在抛 NotFoundException', async () => {
    await expect(controller.remove('s1', { id: 'user-1', role: 'authenticated' })).rejects.toThrow(
      NotFoundException,
    )
  })
})
