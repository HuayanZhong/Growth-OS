import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditService } from '../../../src/modules/audit/audit.service.ts'
import { AgentsController } from '../../../src/modules/agents/agents.controller.ts'
import { AgentsService } from '../../../src/modules/agents/agents.service.ts'

/** Agent 域端点走真实 service（EM 假对象注入）：空态 / 404 / create 透传 */
describe('AgentsController', () => {
  let controller: AgentsController

  beforeEach(async () => {
    vi.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        AgentsService,
        {
          provide: AuditService,
          useValue: { record: vi.fn<(entry: unknown) => Promise<void>>() },
        },
        {
          provide: getMikroORMToken('default'),
          useValue: {
            em: {
              fork: () => ({
                find: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
                findOne: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
                create: vi.fn<(entity: unknown, data: unknown) => unknown>(),
                persist: vi.fn<(entity: unknown) => unknown>(),
                remove: vi.fn<(entity: unknown) => unknown>(),
                flush: vi.fn<() => Promise<void>>(),
              }),
            },
          },
        },
      ],
    }).compile()
    controller = moduleRef.get(AgentsController)
  })

  it('列表为空数组', async () => {
    expect(await controller.list()).toEqual([])
  })

  it('详情不存在抛 NotFoundException（信封码 NOT_FOUND）', async () => {
    await expect(controller.get('a1')).rejects.toThrow(NotFoundException)
  })

  it('create 透传 service（actor 来自 JWT）', async () => {
    const agent = await controller.create(
      { name: 'n', systemPrompt: 'p', model: 'deepseek-chat' },
      { id: 'user-1', role: 'authenticated' },
    )
    expect(agent.name).toBe('n')
    expect(agent.enabled).toBe(true)
  })

  it('remove 不存在抛 NotFoundException', async () => {
    await expect(controller.remove('a1', { id: 'user-1', role: 'authenticated' })).rejects.toThrow(
      NotFoundException,
    )
  })
})
