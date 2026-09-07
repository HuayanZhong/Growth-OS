import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditService } from '../../../src/modules/audit/audit.service.ts'
import { ProjectsController } from '../../../src/modules/projects/projects.controller.ts'
import { ProjectsService } from '../../../src/modules/projects/projects.service.ts'

/** Project 域端点走真实 service（EM 假对象注入）：空态 / 404 / create 透传 */
describe('ProjectsController', () => {
  let controller: ProjectsController

  beforeEach(async () => {
    vi.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        ProjectsService,
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
    controller = moduleRef.get(ProjectsController)
  })

  it('列表为空数组', async () => {
    expect(await controller.list()).toEqual([])
  })

  it('详情不存在抛 NotFoundException', async () => {
    await expect(controller.get('p1')).rejects.toThrow(NotFoundException)
  })

  it('create 透传 service：id 列表缺省为空数组（actor 来自 JWT）', async () => {
    const project = await controller.create({ name: 'p' }, { id: 'user-1', role: 'authenticated' })
    expect(project.name).toBe('p')
    expect(project.agentIds).toEqual([])
    expect(project.sessionIds).toEqual([])
  })

  it('remove 不存在抛 NotFoundException', async () => {
    await expect(controller.remove('p1', { id: 'user-1', role: 'authenticated' })).rejects.toThrow(
      NotFoundException,
    )
  })
})
