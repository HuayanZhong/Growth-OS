import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuditService } from '../../../src/modules/audit/audit.service.ts'
import { AgentsService } from '../../../src/modules/agents/agents.service.ts'
import { AgentEntity } from '../../../src/modules/agents/entities/agent.entity.ts'
import type { AgentRow } from '../../../src/modules/agents/entities/agent.entity.ts'

/**
 * Agent 域存储：CRUD + 审计。与 sessions 域同构（EM 假对象注入），
 * 这里只覆盖域内关键行为：create 缺省/审计、404、update 字段赋值、映射。
 */
describe('AgentsService', () => {
  const T0 = 1_700_000_000_000

  let service: AgentsService
  const auditService = { record: vi.fn<(entry: unknown) => Promise<void>>() }
  const fakeEm = {
    find: vi.fn<(entity: unknown, where?: unknown, options?: unknown) => Promise<unknown[]>>(),
    findOne: vi.fn<(entity: unknown, where?: unknown) => Promise<unknown>>(),
    create: vi.fn<(entity: unknown, data: unknown) => unknown>(),
    persist: vi.fn<(entity: unknown) => unknown>(),
    remove: vi.fn<(entity: unknown) => unknown>(),
    flush: vi.fn<() => Promise<void>>(),
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: AuditService, useValue: auditService },
        {
          provide: getMikroORMToken('default'),
          useValue: { em: { fork: () => fakeEm } },
        },
      ],
    }).compile()
    service = moduleRef.get(AgentsService)
  })

  function makeRow(over: Partial<AgentRow> = {}): AgentRow {
    const base: AgentRow = {
      id: 'a1',
      name: '助手',
      systemPrompt: '你是助手',
      model: 'deepseek-chat',
      toolIds: ['skill-1'],
      description: null,
      enabled: true,
      createdAt: new Date(T0),
      updatedAt: new Date(T0),
    }
    return Object.assign(base, over)
  }

  it('create：id/时间戳服务端生成，toolIds/enabled 缺省，记审计', async () => {
    const agent = await service.create({ name: 'n', systemPrompt: 'p', model: 'm' }, 'user-1')
    expect(agent.toolIds).toEqual([])
    expect(agent.enabled).toBe(true)
    expect(agent.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(fakeEm.create).toHaveBeenCalledWith(
      AgentEntity,
      expect.objectContaining({ name: 'n', toolIds: [], enabled: true }),
    )
    expect(auditService.record).toHaveBeenCalledWith({
      actorId: 'user-1',
      action: 'create',
      resourceType: 'agent',
      resourceId: agent.id,
      details: { name: 'n', model: 'm' },
    })
  })

  it('getById：不存在 404；存在映射契约（Date → epoch ms，null description 不落回）', async () => {
    fakeEm.findOne.mockResolvedValue(null)
    await expect(service.getById('missing')).rejects.toThrow(NotFoundException)

    fakeEm.findOne.mockResolvedValue(makeRow())
    expect(await service.getById('a1')).toEqual({
      id: 'a1',
      name: '助手',
      systemPrompt: '你是助手',
      model: 'deepseek-chat',
      toolIds: ['skill-1'],
      enabled: true,
      createdAt: T0,
      updatedAt: T0,
    })
  })

  it('update：Partial 字段逐个赋值，description 可置回', async () => {
    const row = makeRow({ description: '旧描述' })
    fakeEm.findOne.mockResolvedValue(row)
    const result = await service.update('a1', { description: '新描述', enabled: false }, 'user-1')
    expect(result.description).toBe('新描述')
    expect(result.enabled).toBe(false)
    expect(result.updatedAt).toBeGreaterThan(T0)
    expect(auditService.record).toHaveBeenCalledWith({
      actorId: 'user-1',
      action: 'update',
      resourceType: 'agent',
      resourceId: 'a1',
      details: { fields: ['description', 'enabled'] },
    })
  })

  it('remove：404 / 删除 + 记审计', async () => {
    fakeEm.findOne.mockResolvedValue(null)
    await expect(service.remove('missing', 'user-1')).rejects.toThrow(NotFoundException)

    const row = makeRow()
    fakeEm.findOne.mockResolvedValue(row)
    await service.remove('a1', 'user-1')
    expect(fakeEm.remove).toHaveBeenCalledWith(row)
    expect(auditService.record).toHaveBeenCalledWith({
      actorId: 'user-1',
      action: 'delete',
      resourceType: 'agent',
      resourceId: 'a1',
      details: { name: '助手' },
    })
  })
})
