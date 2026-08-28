import { describe, it, expect, vi } from 'vitest'
import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { SupabaseJwtGuard } from './supabase-jwt.guard.ts'
import type { JwtVerifierService } from './jwt-verifier.service.ts'

function createContext(authHeader?: string) {
  const request = { headers: { authorization: authHeader } }
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
  return { context, request: request as Record<string, unknown> & { user?: unknown } }
}

function createGuard(options: { isPublic?: boolean; verify?: (t: string) => Promise<unknown> }) {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(options.isPublic ?? false),
  } as unknown as Reflector
  const verifier = { verify: options.verify ?? vi.fn() } as unknown as JwtVerifierService
  return new SupabaseJwtGuard(reflector, verifier)
}

describe('SupabaseJwtGuard', () => {
  it('@Public() 路由直接放行，不做任何验证', async () => {
    const { context } = createContext()
    const verify = vi.fn()
    const guard = createGuard({ isPublic: true, verify })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(verify).not.toHaveBeenCalled()
  })

  it('无 Authorization 头：抛 UNAUTHORIZED 信封（经异常过滤器输出给客户端）', async () => {
    const { context } = createContext(undefined)
    const guard = createGuard({})

    const err = await guard.canActivate(context).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(UnauthorizedException)
    expect((err as UnauthorizedException).getResponse()).toMatchObject({
      code: 'UNAUTHORIZED',
      message: '未登录或登录已过期',
    })
  })

  it('非 Bearer 方案（如 Basic）：拒绝', async () => {
    const { context } = createContext('Basic dXNlcjpwYXNz')
    const guard = createGuard({})

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
  })

  it('验证通过：token 交给 verifier，身份挂载到 request.user 并放行', async () => {
    const { context, request } = createContext('Bearer good-token')
    const user = { id: 'u-1', email: 'a@b.com', role: 'authenticated' }
    const verify = vi.fn().mockResolvedValue(user)
    const guard = createGuard({ verify })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(verify).toHaveBeenCalledWith('good-token')
    expect(request.user).toEqual(user)
  })

  it('verifier 拒绝时异常原样上抛（不吞不包装）', async () => {
    const { context } = createContext('Bearer expired-token')
    const guard = createGuard({ verify: () => Promise.reject(new UnauthorizedException()) })

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
  })
})
