import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentsController } from '../../../src/modules/agents/agents.controller.ts'
import { AgentsService } from '../../../src/modules/agents/agents.service.ts'
import type { Agent } from '@growth-os/types'

describe('AgentsController', () => {
  let controller: AgentsController
  const serviceMock = {
    create: vi.fn<(userId: string, input: unknown) => Promise<Agent>>(),
    list: vi.fn<(userId: string) => Promise<Agent[]>>(),
    remove: vi.fn<(userId: string, slug: string) => Promise<void>>(),
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [{ provide: AgentsService, useValue: serviceMock }],
    }).compile()
    controller = moduleRef.get(AgentsController)
  })

  const USER = { id: 'user-1', role: 'authenticated' }

  it('create 透传 userId 与入参到 service', async () => {
    const agent: Agent = {
      id: 'row-1',
      slug: 'agent-abc12345',
      name: 'x',
      isDefault: false,
      emotion: '02',
    }
    serviceMock.create.mockResolvedValue(agent)
    const input = { name: 'x', emotion: '02' }

    expect(await controller.create(USER, input)).toEqual(agent)
    expect(serviceMock.create).toHaveBeenCalledWith('user-1', input)
  })

  it('list 透传 userId（空态返回空数组）', async () => {
    serviceMock.list.mockResolvedValue([])
    expect(await controller.list(USER)).toEqual([])
    expect(serviceMock.list).toHaveBeenCalledWith('user-1')
  })

  it('remove 透传 userId/id 并返回删除确认', async () => {
    serviceMock.remove.mockResolvedValue(undefined)
    expect(await controller.remove(USER, 'row-1')).toEqual({ deleted: true })
    expect(serviceMock.remove).toHaveBeenCalledWith('user-1', 'row-1')
  })
})
