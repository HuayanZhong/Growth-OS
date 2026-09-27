import { Test } from '@nestjs/testing'
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { QueryOrder } from '@mikro-orm/core'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentsService } from '../../../src/modules/agents/agents.service.ts'
import { AgentEntity } from '../../../src/modules/agents/entities/agent.entity.ts'
import type { AgentRow } from '../../../src/modules/agents/entities/agent.entity.ts'

/**
 * Agent 目录 service：创建/列表/删除（fork 后的 EM 以假对象注入；service
 * 因 app.module 关闭 request context 采用 InjectMikroORM + fork 模式）。
 */
describe('AgentsService', () => {
  const T0 = 1_700_000_000_000

  let service: AgentsService
  const fakeEm = {
    findOne: vi.fn<(entity: unknown, where?: unknown) => Promise<unknown | null>>(),
    find: vi.fn<(entity: unknown, where?: unknown, options?: unknown) => Promise<unknown[]>>(),
    create: vi.fn<(entity: unknown, data: unknown) => unknown>(),
    persist: vi.fn<(entity: unknown) => unknown>(),
    flush: vi.fn<() => Promise<void>>(),
    remove: vi.fn<(entity: unknown) => unknown>(),
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        AgentsService,
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
      id: 'row-1',
      userId: 'user-1',
      slug: 'agent-abc12345',
      name: '写作助手',
      emotion: '10',
      color: null,
      description: null,
      skills: null,
      isDefault: false,
      createdAt: new Date(T0),
    }
    return Object.assign(base, over)
  }

  const DEFAULT_ROW: AgentRow = {
    id: 'seed-uuid',
    userId: null,
    slug: 'xiaohuayan',
    name: '小花颜',
    emotion: '02',
    color: null,
    description: null,
    skills: null,
    isDefault: true,
    createdAt: new Date(T0 - 1_000),
  }

  describe('create', () => {
    it('与默认 Agent 同名返回 409 AGENT_NAME_EXISTS（seed 行在冲突域内）', async () => {
      // 查重命中默认行（isDefault true，userId null）
      fakeEm.findOne.mockResolvedValue(DEFAULT_ROW)

      const err = await service.create('user-1', { name: '小花颜', emotion: '10' }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(err.response).toMatchObject({ code: 'AGENT_NAME_EXISTS' })
      expect(fakeEm.persist).not.toHaveBeenCalled()
    })

    it('同用户重名返回 409 AGENT_NAME_EXISTS，不落库', async () => {
      fakeEm.findOne.mockResolvedValue(makeRow())

      await expect(
        service.create('user-1', { name: '写作助手', emotion: '10' }),
      ).rejects.toMatchObject({
        constructor: ConflictException,
        response: { code: 'AGENT_NAME_EXISTS' },
      })
      expect(fakeEm.persist).not.toHaveBeenCalled()
      expect(fakeEm.flush).not.toHaveBeenCalled()
    })

    it('他人同名不拦截（冲突域不含他人自建）', async () => {
      // 查重查询返回空（他人行不满足 userId 条件）
      fakeEm.findOne.mockResolvedValue(null)
      fakeEm.create.mockReturnValue(makeRow())

      await expect(
        service.create('user-2', { name: '写作助手', emotion: '10' }),
      ).resolves.toBeDefined()
    })

    it('生成 slug/id/时间戳并持久化，返回契约数据（可选字段缺省不落回）', async () => {
      fakeEm.findOne.mockResolvedValue(null)
      const created = makeRow({ skills: ['skill-a'] })
      fakeEm.create.mockReturnValue(created)

      const agent = await service.create('user-1', {
        name: '  写作助手  ',
        emotion: '10',
        skills: ['skill-a'],
      })

      expect(fakeEm.create).toHaveBeenCalledTimes(1)
      const [, data] = fakeEm.create.mock.calls[0]!
      expect(data).toMatchObject({
        userId: 'user-1',
        name: '  写作助手  ',
        emotion: '10',
        skills: ['skill-a'],
        isDefault: false,
      })
      expect(String((data as { slug: string }).slug)).toMatch(/^agent-[0-9a-f]{8}$/)
      expect(fakeEm.persist).toHaveBeenCalledTimes(1)
      expect(fakeEm.flush).toHaveBeenCalledTimes(1)
      expect(agent).toEqual({
        id: 'row-1',
        slug: 'agent-abc12345',
        name: '写作助手',
        isDefault: false,
        emotion: '10',
        skills: ['skill-a'],
      })
    })

    it('slug 冲突时重生成（findOne 命中后继续循环）', async () => {
      fakeEm.findOne.mockImplementation((_entity, where) => {
        const query = where as { slug?: string }
        return Promise.resolve(
          query?.slug === 'agent-dup0001' ? makeRow({ slug: 'agent-dup0001' }) : null,
        )
      })
      fakeEm.create.mockReturnValue(makeRow({ slug: 'agent-next0002' }))

      const agent = await service.create('user-1', { name: 'x', emotion: '02' })

      expect(fakeEm.findOne).toHaveBeenCalledTimes(2)
      expect(agent.slug).toBe('agent-next0002')
    })
  })

  describe('list', () => {
    it('查询默认行 + 本人行，isDefault 前置 + createdAt 升序，行→契约映射', async () => {
      fakeEm.find.mockResolvedValue([
        DEFAULT_ROW,
        makeRow(),
        makeRow({ id: 'row-2', slug: 'agent-later0001', createdAt: new Date(T0 + 5_000) }),
      ])

      const agents = await service.list('user-1')

      expect(fakeEm.find).toHaveBeenCalledWith(
        AgentEntity,
        { $or: [{ isDefault: true }, { userId: 'user-1' }] },
        { orderBy: { isDefault: QueryOrder.DESC, createdAt: QueryOrder.ASC } },
      )
      expect(agents).toEqual([
        { id: 'seed-uuid', slug: 'xiaohuayan', name: '小花颜', isDefault: true, emotion: '02' },
        { id: 'row-1', slug: 'agent-abc12345', name: '写作助手', isDefault: false, emotion: '10' },
        { id: 'row-2', slug: 'agent-later0001', name: '写作助手', isDefault: false, emotion: '10' },
      ])
    })
  })

  describe('remove', () => {
    it('本人自建行按 id 删除成功', async () => {
      const row = makeRow()
      fakeEm.findOne.mockResolvedValue(row)

      await service.remove('user-1', 'row-1')

      expect(fakeEm.remove).toHaveBeenCalledWith(row)
      expect(fakeEm.flush).toHaveBeenCalledTimes(1)
    })

    it('默认 Agent 拒绝删除（403 + 机器可读错误码）', async () => {
      fakeEm.findOne.mockResolvedValue(DEFAULT_ROW)

      const err = await service.remove('user-1', 'seed-uuid').catch((e) => e)
      expect(err).toBeInstanceOf(ForbiddenException)
      expect(err.response).toMatchObject({ code: 'AGENT_DEFAULT_IMMUTABLE' })
      expect(fakeEm.remove).not.toHaveBeenCalled()
      expect(fakeEm.flush).not.toHaveBeenCalled()
    })

    it('不存在返回 404', async () => {
      fakeEm.findOne.mockResolvedValue(null)

      const err = await service.remove('user-1', 'missing').catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toMatchObject({ code: 'AGENT_NOT_FOUND' })
    })

    it('他人记录返回 404（不泄露存在性）', async () => {
      fakeEm.findOne.mockResolvedValue(makeRow({ userId: 'user-other' }))

      const err = await service.remove('user-1', 'row-1').catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toMatchObject({ code: 'AGENT_NOT_FOUND' })
      expect(fakeEm.remove).not.toHaveBeenCalled()
      expect(fakeEm.flush).not.toHaveBeenCalled()
    })
  })
})
