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
 * 覆盖：未登录拦截、已登录访问登录页弹回、放行路径、getSession 异常视为未登录、
 * 本地过期预检（expires_at 已过/恰好到期视同未登录，未过期放行）
 */
type To = { path: string }

const nowSec = () => Math.floor(Date.now() / 1000)

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

  it('已登录访问 /auth -> 弹回登录后默认入口 /dashboard/tasks/new', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { id: 'u1' } } })
    expect(await run({ path: '/auth' })).toEqual(['/dashboard/tasks/new'])
  })

  it('已登录访问受保护页 -> 放行（不跳转）', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { id: 'u1' } } })
    expect(await run({ path: '/dashboard' })).toEqual([])
  })

  it('getSession 抛错（storage/IPC 异常）视为未登录，不把导航打回错误页', async () => {
    mocks.getSession.mockRejectedValue(new Error('ipc failed'))
    expect(await run({ path: '/dashboard' })).toEqual(['/auth'])
  })

  it('持久化会话已过期（expires_at 早于当前时间）访问受保护页 -> 重定向 /auth', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { id: 'u1', expires_at: nowSec() - 60 } },
    })
    expect(await run({ path: '/dashboard/tasks/new' })).toEqual(['/auth'])
  })

  it('会话恰好到期（expires_at 等于当前时间）视同过期 -> 重定向 /auth', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { id: 'u1', expires_at: nowSec() } },
    })
    expect(await run({ path: '/dashboard' })).toEqual(['/auth'])
  })

  it('会话未过期（expires_at 晚于当前时间）访问受保护页 -> 放行', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { id: 'u1', expires_at: nowSec() + 3600 } },
    })
    expect(await run({ path: '/dashboard' })).toEqual([])
  })

  it('会话未过期访问 /auth -> 弹回登录后默认入口', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { id: 'u1', expires_at: nowSec() + 3600 } },
    })
    expect(await run({ path: '/auth' })).toEqual(['/dashboard/tasks/new'])
  })
})
