import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mocks = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  getSession: vi.fn(),
}))

mockNuxtImport('navigateTo', () => mocks.navigateTo)
mockNuxtImport('useSupabase', () => () => ({ auth: { getSession: mocks.getSession } }))

import authMiddleware from '~/middleware/auth.global'

/**
 * 全局认证守卫测试
 * 覆盖：未登录拦截、已登录访问登录页弹回、放行路径、getSession 异常视为未登录
 */
type To = { path: string }

async function run(to: To) {
  mocks.navigateTo.mockClear()
  await authMiddleware(to as never, {} as never)
  return mocks.navigateTo.mock.calls.map((c) => c[0])
}

describe('auth.global 守卫', () => {
  beforeEach(() => {
    mocks.getSession.mockReset()
  })

  it('未登录访问受保护页 -> 重定向 /auth', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })
    expect(await run({ path: '/dashboard' })).toEqual(['/auth'])
  })

  it('未登录访问 /auth -> 放行（不跳转）', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })
    expect(await run({ path: '/auth' })).toEqual([])
  })

  it('已登录访问 /auth -> 弹回 /dashboard', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { id: 'u1' } } })
    expect(await run({ path: '/auth' })).toEqual(['/dashboard'])
  })

  it('已登录访问受保护页 -> 放行（不跳转）', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { id: 'u1' } } })
    expect(await run({ path: '/dashboard' })).toEqual([])
  })

  it('getSession 抛错（storage/IPC 异常）视为未登录，不把导航打回错误页', async () => {
    mocks.getSession.mockRejectedValue(new Error('ipc failed'))
    expect(await run({ path: '/dashboard' })).toEqual(['/auth'])
  })
})
