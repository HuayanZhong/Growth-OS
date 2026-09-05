import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mocks = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
  },
}))

// 只 mock 应用级 composable（useSupabase）；useRuntimeConfig 是 Nuxt 内置，
// mockNuxtImport 不支持且会破坏环境装配（见 .trae/rules/frontend/tests/environment.md），
// 断言使用其真实默认值 http://localhost:4000
mockNuxtImport('useSupabase', () => () => ({ auth: mocks.auth }))

import { apiFetch, ApiError } from '~/composables/useApi'

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('apiFetch', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mocks.auth.getSession.mockReset()
  })

  it('无本地 session：抛 401 ApiError 且不发起请求', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } })

    await expect(apiFetch('/agents')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'UNAUTHORIZED',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('成功路径：URL 归一拼接 /api/v1，Authorization 头携带 access_token', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [{ id: 'a1' }] }))

    await expect(apiFetch('/agents')).resolves.toEqual([{ id: 'a1' }])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/agents',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer tok-1' }),
      }),
    )
  })

  it('POST 带 body：JSON 序列化并补 Content-Type', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { ok: true } }))

    await apiFetch('/conversations', { method: 'POST', body: { agentId: 'a1' } })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ agentId: 'a1' }))
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('非 200 信封响应：ApiError 透传状态码与错误码', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    fetchMock.mockResolvedValue(jsonResponse(404, { code: 'NOT_FOUND', message: '会话不存在' }))

    await expect(apiFetch('/conversations/c9')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'NOT_FOUND',
      message: '会话不存在',
    })
  })

  it('非 200 非信封响应（如网关 HTML 错误页）：回退通用文案', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }))

    await expect(apiFetch('/agents')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      code: 'HTTP_502',
    })
  })

  it('ApiError 是 Error 的子类（可被既有 toast 分支捕获）', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } })

    const err = await apiFetch('/x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toBeInstanceOf(Error)
  })
})
