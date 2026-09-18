import { afterEach, describe, it, expect, vi } from 'vitest'
import { UnauthorizedException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { AuthService } from '../../../src/modules/auth/auth.service.ts'

/**
 * 登录服务单测：全 mock（不触真实 Supabase），覆盖成功映射与各失败分支。
 * fetch 用 vi.stubGlobal 替换，ConfigService 用手写桩。
 */

const ENV = {
  SUPABASE_URL: 'https://example.supabase.co/',
  NUXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
}

function createService(env: Record<string, string> = ENV) {
  const config = {
    get: vi.fn((key: string) => env[key]),
  } as unknown as ConfigService
  return { service: new AuthService(config), config }
}

/** 构造 Supabase password grant 成功响应 */
function tokenResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      access_token: 'sb-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'sb-refresh-token',
      user: { id: 'u-1', email: 'a@b.com', user_metadata: { nested: true } },
      ...overrides,
    }),
  }
}

describe('AuthService.signInWithPassword', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('成功：请求带 apikey 与 JSON body，响应精简映射且不透传 refresh_token / metadata', async () => {
    const { service } = createService()
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse())
    vi.stubGlobal('fetch', fetchMock)

    const result = await service.signInWithPassword({ email: 'a@b.com', password: 'password123' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/token?grant_type=password',
      {
        method: 'POST',
        headers: { apikey: 'anon-key', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.com', password: 'password123' }),
      },
    )
    // toEqual 精确匹配：多余字段（refresh_token / user_metadata）一旦透传即失败
    expect(result).toEqual({
      accessToken: 'sb-access-token',
      tokenType: 'bearer',
      expiresIn: 3600,
      user: { id: 'u-1', email: 'a@b.com' },
    })
  })

  it('400：凭据错误 → 401「邮箱或密码不正确」', async () => {
    const { service } = createService()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }),
    )

    const err = await service
      .signInWithPassword({ email: 'a@b.com', password: 'wrong-pass' })
      .catch((e: unknown) => e)

    expect(err).toBeInstanceOf(UnauthorizedException)
    expect((err as UnauthorizedException).getResponse()).toMatchObject({
      code: 'UNAUTHORIZED',
      message: '邮箱或密码不正确',
    })
  })

  it('上游其他非 200（如 429 限流）→ 401 通用文案，不泄露上游细节', async () => {
    const { service } = createService()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }),
    )

    const err = await service
      .signInWithPassword({ email: 'a@b.com', password: 'password123' })
      .catch((e: unknown) => e)

    expect((err as UnauthorizedException).getResponse()).toMatchObject({
      code: 'UNAUTHORIZED',
      message: '登录失败，请稍后重试',
    })
  })

  it('网络不可达 → 401，不放大为 500', async () => {
    const { service } = createService()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    await expect(
      service.signInWithPassword({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('响应体非 JSON → 401', async () => {
    const { service } = createService()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => Promise.reject(new Error('bad json')),
      }),
    )

    await expect(
      service.signInWithPassword({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('响应缺 access_token → 401（上游异常响应）', async () => {
    const { service } = createService()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(tokenResponse({ access_token: undefined })))

    await expect(
      service.signInWithPassword({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('响应缺 user.id → 401', async () => {
    const { service } = createService()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(tokenResponse({ user: { email: 'a@b.com' } })))

    await expect(
      service.signInWithPassword({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('缺 anon key → 401，且不发起网络请求', async () => {
    const { service } = createService({ SUPABASE_URL: ENV.SUPABASE_URL })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      service.signInWithPassword({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('缺 SUPABASE_URL → 401「服务端未配置鉴权来源」，且不发起网络请求', async () => {
    const { service } = createService({})
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const err = await service
      .signInWithPassword({ email: 'a@b.com', password: 'password123' })
      .catch((e: unknown) => e)

    expect((err as UnauthorizedException).getResponse()).toMatchObject({
      code: 'UNAUTHORIZED',
      message: '服务端未配置鉴权来源',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
