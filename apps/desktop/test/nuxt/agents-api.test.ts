import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Agent } from '@growth-os/types'
import { agentsApi } from '~/features/agents/api'
import { ApiError } from '~/composables/useApi'

/**
 * Agent 域 typed client 测试：走真实 apiFetch 链路（mockNuxtImport useSupabase
 * + stub 全局 fetch，同 use-api.test.ts），断言各端点的路径拼接、方法、body
 * 与信封解包是否符合 AgentsApiMap 契约。
 */
const mocks = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
  },
}))

mockNuxtImport('useSupabase', () => () => ({ auth: mocks.auth }))

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const agentFixture = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'a1',
  name: '小芽',
  systemPrompt: '你是小芽',
  model: 'deepseek-chat',
  toolIds: [],
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
})

describe('agentsApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-agents' } },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mocks.auth.getSession.mockReset()
  })

  it('list: GET /agents，解包 { data } 信封', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [agentFixture()] }))

    await expect(agentsApi.list()).resolves.toEqual([agentFixture()])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/agents',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('getById: 路径参数拼进 /agents/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: agentFixture() }))

    await expect(agentsApi.getById('a1')).resolves.toEqual(agentFixture())
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/agents/a1',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('create: POST body 直传契约入参', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: agentFixture() }))
    const input = { name: '新芽', systemPrompt: '', model: 'deepseek-chat' }

    await expect(agentsApi.create(input)).resolves.toEqual(agentFixture())
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/agents',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    )
  })

  it('update: PATCH 部分字段到 /agents/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: agentFixture({ name: '新名字' }) }))

    await expect(agentsApi.update('a1', { name: '新名字' })).resolves.toEqual(
      agentFixture({ name: '新名字' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/agents/a1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: '新名字' }) }),
    )
  })

  it('remove: DELETE 无业务数据（空信封解包为 undefined）', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}))

    await expect(agentsApi.remove('a1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/agents/a1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('错误路径：非 2xx 信封抛 ApiError（骨架期写路径 501）', async () => {
    // Response body 只能消费一次：每次调用都返回新 Response
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResponse(501, { code: 'NOT_IMPLEMENTED', message: '创建 Agent尚未实现' }),
      ),
    )

    const error = await agentsApi
      .create({ name: 'x', systemPrompt: '', model: 'm' })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' })
  })
})
