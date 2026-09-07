import { Test } from '@nestjs/testing'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditController } from '../../../src/modules/audit/audit.controller.ts'
import { AuditService } from '../../../src/modules/audit/audit.service.ts'

describe('AuditController', () => {
  let controller: AuditController

  beforeEach(async () => {
    vi.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        AuditService,
        {
          provide: getMikroORMToken('default'),
          useValue: {
            em: {
              fork: () => ({
                find: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
                create: vi.fn<(entity: unknown, data: unknown) => unknown>(),
                persist: vi.fn<(entity: unknown) => unknown>(),
                flush: vi.fn<() => Promise<void>>(),
              }),
            },
          },
        },
      ],
    }).compile()
    controller = moduleRef.get(AuditController)
  })

  it('查询透传 service（空态返回空数组）', async () => {
    expect(await controller.list({ actorId: 'user-1', limit: 10 })).toEqual([])
  })
})
