import { NotFoundException, NotImplementedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionsController } from '../../../src/modules/sessions/sessions.controller.ts'
import { SessionsService } from '../../../src/modules/sessions/sessions.service.ts'

/**
 * Session 域端点：事件序列与消息投影走真实 service（EM 以空查询假对象注入，
 * 空态返回空序列）；会话 CRUD 仍为骨架（详情 404、写路径 501）。
 */
describe('SessionsController', () => {
  let controller: SessionsController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        SessionsService,
        {
          provide: getMikroORMToken('default'),
          useValue: {
            em: {
              fork: () => ({
                find: vi.fn<() => Promise<never[]>>().mockResolvedValue([]),
                findOne: vi.fn<() => Promise<null>>().mockResolvedValue(null),
                create: vi.fn<(data: unknown) => unknown>(),
                flush: vi.fn<() => Promise<void>>(),
              }),
            },
          },
        },
      ],
    }).compile()
    controller = moduleRef.get(SessionsController)
  })

  it('列表为空，事件序列与消息投影为空历史', async () => {
    expect(controller.list()).toEqual([])
    expect(await controller.listEvents('s1')).toEqual([])
    expect(await controller.listMessages('s1')).toEqual([])
  })

  it('详情无数据抛 NotFoundException', () => {
    expect(() => controller.get('s1')).toThrow(NotFoundException)
  })

  it('fork 透传 service：boundary 不存在时 404', async () => {
    await expect(controller.fork('s1', { boundaryEventId: 'missing' })).rejects.toThrow(
      NotFoundException,
    )
  })

  it('创建/更新/删除抛 501 NOT_IMPLEMENTED', () => {
    expect(() => controller.create({ agentId: 'a1' })).toThrow(NotImplementedException)
    expect(() => controller.update('s1', { title: 't' })).toThrow(NotImplementedException)
    expect(() => controller.remove('s1')).toThrow(NotImplementedException)
  })
})
