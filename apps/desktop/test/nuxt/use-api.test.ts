import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mocks = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    signOut: vi.fn(),
  },
  navigateTo: vi.fn(),
}))

// 只 mock 应用级 composable（useSupabase）与 navigateTo；useRuntimeConfig 是 Nuxt 内置，
// mockNuxtImport 不支持且会破坏环境装配（见 .trae/rules/frontend/tests/environment.md），
// 断言使用其真实默认值 http://localhost:4000
mockNuxtImport('useSupabase', () => () => ({ auth: mocks.auth }))
mockNuxtImport('navigateTo', () => mocks.navigateTo)

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
    mocks.auth.signOut.mockResolvedValue({ error: null })
    mocks.navigateTo.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    // 定向重置（避免 resetAllMocks 波及 mockNuxtImport 的环境 mock 装配）
    mocks.auth.getSession.mockReset()
    mocks.auth.refreshSession.mockReset()
    mocks.auth.signOut.mockReset()
    mocks.navigateTo.mockReset()
  })

  it('无本地 session：走登出出口（signOut local + navigateTo /auth），抛 401 且不发起请求', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } })

    await expect(apiFetch('/agents')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'UNAUTHORIZED',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(mocks.navigateTo).toHaveBeenCalledWith('/auth')
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

  it('401 后刷新成功：自动重试原请求并返回结果，不登出不跳转', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    mocks.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'tok-2' } },
    })
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { code: 'UNAUTHORIZED', message: 'token 无效' }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: 'a1' }] }))

    await expect(apiFetch('/agents')).resolves.toEqual([{ id: 'a1' }])
    expect(mocks.auth.refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(mocks.auth.signOut).not.toHaveBeenCalled()
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('401 后刷新失败：本地登出并导航 /auth，抛 SESSION_EXPIRED 终结', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    mocks.auth.refreshSession.mockResolvedValue({ data: { session: null } })
    fetchMock.mockResolvedValue(jsonResponse(401, { code: 'UNAUTHORIZED', message: 'token 无效' }))

    await expect(apiFetch('/agents')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'SESSION_EXPIRED',
    })
    expect(mocks.auth.refreshSession).toHaveBeenCalledTimes(1)
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(mocks.navigateTo).toHaveBeenCalledWith('/auth')
  })

  it('并发 401 刷新失败：刷新/登出/导航仅处置一次', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    mocks.auth.refreshSession.mockResolvedValue({ data: { session: null } })
    fetchMock.mockResolvedValue(jsonResponse(401, { code: 'UNAUTHORIZED', message: 'token 无效' }))

    const results = await Promise.allSettled([apiFetch('/agents'), apiFetch('/agents')])

    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    expect(mocks.auth.refreshSession).toHaveBeenCalledTimes(1)
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.navigateTo).toHaveBeenCalledTimes(1)
  })

  it('重试再遇 401：不再二次处置（防循环），透传信封错误', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    mocks.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'tok-2' } },
    })
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { code: 'UNAUTHORIZED', message: '第一次' }))
      .mockResolvedValueOnce(jsonResponse(401, { code: 'UNAUTHORIZED', message: '第二次' }))

    await expect(apiFetch('/agents')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: '第二次',
    })
    expect(mocks.auth.refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(mocks.auth.signOut).not.toHaveBeenCalled()
  })

  it('500：不触发刷新/登出/跳转，抛携带状态码的 ApiError', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    fetchMock.mockResolvedValue(jsonResponse(500, { code: 'INTERNAL', message: '服务器故障' }))

    await expect(apiFetch('/agents')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      code: 'INTERNAL',
    })
    expect(mocks.auth.refreshSession).not.toHaveBeenCalled()
    expect(mocks.auth.signOut).not.toHaveBeenCalled()
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('网络异常：不触发刷新/登出/跳转，网络错误向上传播', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(apiFetch('/agents')).rejects.toBeInstanceOf(TypeError)
    expect(mocks.auth.refreshSession).not.toHaveBeenCalled()
    expect(mocks.auth.signOut).not.toHaveBeenCalled()
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('其他 4xx（如 403）：不触发登出与跳转', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
    })
    fetchMock.mockResolvedValue(jsonResponse(403, { code: 'FORBIDDEN', message: '禁止删除' }))

    await expect(apiFetch('/agents/x', { method: 'DELETE' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'FORBIDDEN',
    })
    expect(mocks.auth.refreshSession).not.toHaveBeenCalled()
    expect(mocks.auth.signOut).not.toHaveBeenCalled()
    expect(mocks.navigateTo).not.toHaveBeenCalled()
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
