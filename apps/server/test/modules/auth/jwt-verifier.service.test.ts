import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MockInstance } from 'vitest'
import { UnauthorizedException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from 'jose'
import { JwtVerifierService } from '../../../src/modules/auth/jwt-verifier.service.ts'

// jose 是纯函数库，直接整体 mock：隔离网络（JWKS 拉取）与真实密码学运算。
// vi.mock 由 Vitest 提升到所有 import 之前，写在 import 后是官方惯用形态
vi.mock('jose', () => ({
  decodeProtectedHeader: vi.fn(),
  decodeJwt: vi.fn(),
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(() => Symbol('jwks')),
}))

const jose = {
  decodeProtectedHeader: vi.mocked(decodeProtectedHeader),
  decodeJwt: vi.mocked(decodeJwt),
  jwtVerify: vi.mocked(jwtVerify),
  createRemoteJWKSet: vi.mocked(createRemoteJWKSet),
}

function createService(env: Record<string, string> = {}): JwtVerifierService {
  const config = {
    get: (key: string): string | undefined => env[key],
  } as unknown as ConfigService
  return new JwtVerifierService(config)
}

const ENV = {
  SUPABASE_URL: 'https://ref.supabase.co',
  NUXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
}

/** 构造符合 jose JWTVerifyResult 形状的 mock 返回值（key 为必填字段） */
function verifyOk(payload: Record<string, unknown>): ReturnType<typeof jwtVerify> {
  return Promise.resolve({
    payload,
    protectedHeader: { alg: 'ES256' },
    key: new Uint8Array(),
  }) as ReturnType<typeof jwtVerify>
}

describe('JwtVerifierService', () => {
  let warnSpy: MockInstance

  beforeEach(() => {
    // 清空跨用例累积的调用记录（实现由 afterEach 恢复）
    vi.clearAllMocks()
    warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    vi.restoreAllMocks()
    // restoreAllMocks 会把模块级 mock 的实现重置为 undefined，重建默认行为
    jose.createRemoteJWKSet.mockImplementation((() =>
      Symbol('jwks')) as unknown as typeof createRemoteJWKSet)
  })

  it('ES256 token：走 JWKS 本地验签，payload 映射为 AuthenticatedUser', async () => {
    jose.decodeProtectedHeader.mockReturnValue({ alg: 'ES256' })
    jose.jwtVerify.mockReturnValue(
      verifyOk({ sub: 'u-1', email: 'a@b.com', role: 'authenticated' }),
    )

    const user = await createService(ENV).verify('token-es256')

    expect(user).toEqual({ id: 'u-1', email: 'a@b.com', role: 'authenticated' })
    expect(jose.createRemoteJWKSet).toHaveBeenCalledWith(
      new URL('https://ref.supabase.co/auth/v1/.well-known/jwks.json'),
    )
    expect(jose.jwtVerify).toHaveBeenCalledWith('token-es256', expect.anything(), {
      clockTolerance: 30,
    })
  })

  it('同一 URL 下 JWKS 句柄只创建一次（缓存生效）', async () => {
    jose.decodeProtectedHeader.mockReturnValue({ alg: 'ES256' })
    jose.jwtVerify.mockReturnValue(verifyOk({ sub: 'u-1' }))
    const service = createService(ENV)

    await service.verify('t1')
    await service.verify('t2')

    expect(jose.createRemoteJWKSet).toHaveBeenCalledTimes(1)
  })

  it('HS256 token：不本地验签，转 Auth 服务器探针校验', async () => {
    jose.decodeProtectedHeader.mockReturnValue({ alg: 'HS256' })
    jose.decodeJwt.mockReturnValue({ sub: 'u-2', role: 'authenticated' })
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }))

    const user = await createService(ENV).verify('token-hs256')

    expect(user).toEqual({ id: 'u-2', role: 'authenticated' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ref.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'anon-key',
          Authorization: 'Bearer token-hs256',
        }),
      }),
    )
  })

  it('HS256 探针返回非 200：按未认证拒绝', async () => {
    jose.decodeProtectedHeader.mockReturnValue({ alg: 'HS256' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }))

    await expect(createService(ENV).verify('bad')).rejects.toThrow(UnauthorizedException)
  })

  it('探针网络异常：按未认证拒绝，不放大为 500', async () => {
    jose.decodeProtectedHeader.mockReturnValue({ alg: 'HS256' })
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    await expect(createService(ENV).verify('x')).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it.each(['none', 'HS512', undefined])('未知算法 %s 直接拒绝', async (alg) => {
    jose.decodeProtectedHeader.mockReturnValue(alg === undefined ? {} : { alg })

    await expect(createService(ENV).verify('x')).rejects.toThrow(UnauthorizedException)
  })

  it('非法 token 结构（header 解码失败）拒绝', async () => {
    jose.decodeProtectedHeader.mockImplementation(() => {
      throw new Error('Invalid token')
    })

    await expect(createService(ENV).verify('garbage')).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('未配置 Supabase URL 时拒绝并给出配置缺失语义', async () => {
    jose.decodeProtectedHeader.mockReturnValue({ alg: 'ES256' })

    const err = await createService()
      .verify('t')
      .catch((e: unknown) => e)

    expect(err).toBeInstanceOf(UnauthorizedException)
    expect((err as UnauthorizedException).getResponse()).toMatchObject({
      code: 'UNAUTHORIZED',
      message: '服务端未配置鉴权来源',
    })
  })

  it('SUPABASE_URL 未配置时回退 NUXT_PUBLIC_SUPABASE_URL', async () => {
    jose.decodeProtectedHeader.mockReturnValue({ alg: 'ES256' })
    jose.jwtVerify.mockReturnValue(verifyOk({ sub: 'u-3' }))
    const service = createService({
      NUXT_PUBLIC_SUPABASE_URL: 'https://fallback.supabase.co/',
      NUXT_PUBLIC_SUPABASE_ANON_KEY: 'k',
    })

    await service.verify('t')

    expect(jose.createRemoteJWKSet).toHaveBeenCalledWith(
      new URL('https://fallback.supabase.co/auth/v1/.well-known/jwks.json'),
    )
  })

  it('payload.sub 缺失时拒绝（无法建立身份）', async () => {
    jose.decodeProtectedHeader.mockReturnValue({ alg: 'ES256' })
    jose.jwtVerify.mockReturnValue(verifyOk({}))

    await expect(createService(ENV).verify('t')).rejects.toThrow(UnauthorizedException)
  })
})
