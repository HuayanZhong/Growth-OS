import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { SessionEvent, SessionRecord } from '@growth-os/types'
import { sessionsApi } from '~/features/sessions/api'
import { ApiError } from '~/composables/useApi'

/**
 * Session 域 typed client 测试：走真实 apiFetch 链路（mockNuxtImport useSupabase
 * + stub 全局 fetch，同 agents-api.test.ts），断言各端点的路径拼接、方法、body
 * 与信封解包是否符合 SessionsApiMap 契约（含 events/messages 子资源）。
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

const sessionFixture = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  id: 's1',
  agentId: 'a1',
  title: '会话一',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
})

const eventFixture = (overrides: Partial<SessionEvent> = {}): SessionEvent => ({
  id: 'e1',
  type: 'user_message',
  timestamp: 0,
  sessionId: 's1',
  payload: { content: '你好' },
  ...overrides,
})

describe('sessionsApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-sessions' } },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mocks.auth.getSession.mockReset()
  })

  it('list: GET /sessions，解包 { data } 信封', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [sessionFixture()] }))

    await expect(sessionsApi.list()).resolves.toEqual([sessionFixture()])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/sessions',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('create: POST body 直传契约入参', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: sessionFixture() }))
    const input = { agentId: 'a1', title: '新会话' }

    await expect(sessionsApi.create(input)).resolves.toEqual(sessionFixture())
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/sessions',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    )
  })

  it('update: PATCH 标题到 /sessions/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: sessionFixture({ title: '改名' }) }))

    await expect(sessionsApi.update('s1', { title: '改名' })).resolves.toEqual(
      sessionFixture({ title: '改名' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/sessions/s1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ title: '改名' }) }),
    )
  })

  it('remove: DELETE 无业务数据（空信封解包为 undefined）', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}))

    await expect(sessionsApi.remove('s1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/sessions/s1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('events: GET /sessions/:id/events 返回升序事件序列', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [eventFixture()] }))

    await expect(sessionsApi.events('s1')).resolves.toEqual([eventFixture()])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/sessions/s1/events',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('messages: GET /sessions/:id/messages 返回服务端投影历史', async () => {
    const messages = [{ role: 'user', content: '你好' }]
    fetchMock.mockResolvedValue(jsonResponse(200, { data: messages }))

    await expect(sessionsApi.messages('s1')).resolves.toEqual(messages)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/sessions/s1/messages',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('错误路径：非 2xx 信封抛 ApiError（骨架期写路径 501）', async () => {
    // Response body 只能消费一次：每次调用都返回新 Response
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(501, { code: 'NOT_IMPLEMENTED', message: '创建会话尚未实现' })),
    )

    const error = await sessionsApi.create({ agentId: 'a1' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' })
  })
})
