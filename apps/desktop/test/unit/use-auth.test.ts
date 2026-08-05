import { describe, it, expect, vi } from 'vitest'
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

describe('mapAuthError 中文映射', () => {
  it.each([
    ['email_not_confirmed', '邮箱未确认，请先点击邮件中的确认链接'],
    ['invalid_credentials', '邮箱或密码错误'],
    ['user_already_exists', '该邮箱已注册'],
    ['over_request_rate_limit', '请求过于频繁，请稍后再试'],
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
