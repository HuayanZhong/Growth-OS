import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mocks = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resend: vi.fn(),
  },
}))

mockNuxtImport('useSupabase', () => () => ({ auth: mocks.auth }))

import { useAuth, mapAuthError } from '~/composables/useAuth'

/**
 * AuthService 测试
 * 覆盖：5 个方法委托到 supabase.auth、解构后 this 不丢失、mapAuthError 中文映射
 */
describe('AuthService 方法委托', () => {
  it('getSession 返回 session', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { id: 'u1' } } })
    await expect(useAuth().getSession()).resolves.toEqual({ id: 'u1' })
  })

  it('signIn 委托 signInWithPassword', () => {
    useAuth().signIn('a@b.com', '12345678')
    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: '12345678',
    })
  })

  it('signUp 委托 signUp', () => {
    useAuth().signUp('a@b.com', '12345678')
    expect(mocks.auth.signUp).toHaveBeenCalledWith({ email: 'a@b.com', password: '12345678' })
  })

  it('signOut 委托 signOut', () => {
    useAuth().signOut()
    expect(mocks.auth.signOut).toHaveBeenCalled()
  })

  it('forceSignOut 委托 signOut（scope: local，服务端失败时兜底）', () => {
    useAuth().forceSignOut()
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('resendConfirmation 委托 resend（type: signup）', () => {
    useAuth().resendConfirmation('a@b.com')
    expect(mocks.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'a@b.com' })
  })

  it('解构后调用不丢 this（箭头函数字段绑定）', async () => {
    const { signIn } = useAuth()
    signIn('a@b.com', '12345678')
    expect(mocks.auth.signInWithPassword).toHaveBeenCalled()
  })
})

describe('signOutWithFallback 登出兜底', () => {
  const nowSec = Math.floor(Date.now() / 1000)
  const expiredSession = { expires_at: nowSec - 60 } as never
  const validSession = { expires_at: nowSec + 3600 } as never

  beforeEach(() => {
    mocks.auth.getSession.mockClear()
    mocks.auth.signOut.mockClear()
  })

  it('无本地 session：直接本地登出，不请求服务端', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } })
    const result = await useAuth().signOutWithFallback()
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(result.errorMessage).toBe('会话已过期或不存在')
  })

  it('session 已过期：直接本地登出，不请求服务端（避免无谓 403）', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: expiredSession } })
    const result = await useAuth().signOutWithFallback()
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(result.errorMessage).toBe('会话已过期或不存在')
  })

  it('session 有效：正常调用服务端 logout，无错误信息', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: validSession } })
    mocks.auth.signOut.mockResolvedValue({ error: null })
    const result = await useAuth().signOutWithFallback()
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(1)
    expect(mocks.auth.signOut).toHaveBeenCalledWith()
    expect(result.errorMessage).toBeUndefined()
  })

  it('session 有效但服务端 logout 失败（403 等）：降级本地登出并返回接口错误信息', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: validSession } })
    mocks.auth.signOut.mockResolvedValue({ error: { code: 'session_not_found' } })
    const result = await useAuth().signOutWithFallback()
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(2)
    expect(mocks.auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' })
    expect(result.errorMessage).toBe('登录会话已失效，请重新登录')
  })

  it('session 有效但 logout 抛异常（网络中断）：降级本地登出并返回异常信息', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: validSession } })
    // 第一次（无参 logout）抛网络异常，第二次（scope: local 兜底）正常完成
    mocks.auth.signOut
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce({ error: null })
    const result = await useAuth().signOutWithFallback()
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(2)
    expect(mocks.auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' })
    expect(result.errorMessage).toBe('network down')
  })
})

describe('mapAuthError 中文映射', () => {
  it.each([
    ['email_not_confirmed', '邮箱未确认，请先点击邮件中的确认链接'],
    ['invalid_credentials', '邮箱或密码错误'],
    ['user_already_exists', '该邮箱已注册'],
    ['over_request_rate_limit', '请求过于频繁，请稍后再试'],
    ['session_not_found', '登录会话已失效，请重新登录'],
  ])('code=%s -> %s', (code, expected) => {
    expect(mapAuthError({ code } as never)).toBe(expected)
  })

  it('未知 code 回退到 error.message', () => {
    expect(mapAuthError({ code: 'unknown_code', message: 'raw message' } as never)).toBe(
      'raw message',
    )
  })

  it('无 code 时回退到 error.message', () => {
    expect(mapAuthError({ message: 'plain' } as never)).toBe('plain')
  })
})
