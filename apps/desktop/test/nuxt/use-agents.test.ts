import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Agent } from '@growth-os/types'
import { useAgents } from '~/features/agents/use-agents'
import { ApiError } from '~/composables/useApi'

/**
 * Agent 域 composable 测试：走真实 apiFetch 链路（mockNuxtImport useSupabase
 * + stub 全局 fetch），断言列表状态流转（loading、追加、就地替换、失败保持
 * 原值）与错误透传（composable 不吞错）。
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

describe('useAgents', () => {
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

  it('refresh: 填充列表，loading 期间为 true、结束后为 false', async () => {
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(jsonResponse(200, { data: [agentFixture()] })), 0),
        ),
    )

    const { agents, isLoading, refresh } = useAgents()
    const pending = refresh()
    expect(isLoading.value).toBe(true)
    await pending

    expect(isLoading.value).toBe(false)
    expect(agents.value).toEqual([agentFixture()])
  })

  it('refresh: 失败时透传 ApiError，列表保持原值且 loading 复位', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { code: 'HTTP_503', message: '请求失败' }))

    const { agents, isLoading, refresh } = useAgents()
    agents.value = [agentFixture()]

    await expect(refresh()).rejects.toMatchObject({ name: 'ApiError', status: 503 })
    expect(isLoading.value).toBe(false)
    expect(agents.value).toEqual([agentFixture()])
  })

  it('createAgent: 成功后追加到列表尾部', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: agentFixture({ id: 'a2', name: '新芽' }) }),
    )

    const { agents, createAgent } = useAgents()
    agents.value = [agentFixture()]

    const created = await createAgent({ name: '新芽', systemPrompt: '', model: 'deepseek-chat' })
    expect(created.id).toBe('a2')
    expect(agents.value.map((a) => a.id)).toEqual(['a1', 'a2'])
  })

  it('createAgent: 骨架期 501 透传，列表不变', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(501, { code: 'NOT_IMPLEMENTED', message: '创建 Agent尚未实现' }),
    )

    const { agents, createAgent } = useAgents()
    agents.value = [agentFixture()]

    await expect(createAgent({ name: '新芽', systemPrompt: '', model: 'm' })).rejects.toMatchObject(
      {
        code: 'NOT_IMPLEMENTED',
      },
    )
    expect(agents.value.map((a) => a.id)).toEqual(['a1'])
  })

  it('renameAgent: 成功后就地替换列表项', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: agentFixture({ name: '改名芽' }) }))

    const { agents, renameAgent } = useAgents()
    agents.value = [agentFixture(), agentFixture({ id: 'a2' })]

    await renameAgent('a1', '改名芽')
    expect(agents.value.map((a) => a.name)).toEqual(['改名芽', '小芽'])
  })

  it('renameAgent: 失败透传 ApiError，列表保持原值', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(501, { code: 'NOT_IMPLEMENTED', message: '更新 Agent尚未实现' }),
    )

    const { agents, renameAgent } = useAgents()
    agents.value = [agentFixture()]

    await expect(renameAgent('a1', '改名芽')).rejects.toBeInstanceOf(ApiError)
    expect(agents.value.map((a) => a.name)).toEqual(['小芽'])
  })
})
