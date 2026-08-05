import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Supabase 客户端单例测试
 *
 * 不用 mockNuxtImport：
 * - useRuntimeConfig 由 Nuxt 测试环境从 env（NUXT_PUBLIC_SUPABASE_URL）注入真实值
 * - isElectron 是纯函数（读 window.desktop），直接操作 window 状态即可控制分支
 *
 * 模块级 client 单例使 legacy 清理只在首次调用执行，故每个用例
 * vi.resetModules() + 动态 import 重置模块缓存，保证在可控状态下初始化。
 */
async function loadUseSupabase() {
  vi.resetModules()
  const mod = await import('~/composables/useSupabase')
  return mod.useSupabase
}

function setElectron(on: boolean) {
  const win = window as unknown as { desktop?: unknown }
  if (on) {
    win.desktop = { secureStore: vi.fn() }
  } else {
    delete win.desktop
  }
}

describe('useSupabase 单例与 legacy 清理', () => {
  beforeEach(() => {
    localStorage.clear()
    setElectron(false)
  })

  it('Electron 环境下首次调用清理 legacy 明文残留（含派生 sb- key）', async () => {
    setElectron(true)
    // 派生 key 由当前 URL 的 projectRef 生成（CI 无 .env 时是占位 URL，测试不硬编码真实 ref）
    const projectRef = new URL(useRuntimeConfig().public.supabaseUrl).hostname.split('.')[0]!
    const derivedKey = `sb-${projectRef}-auth-token`
    localStorage.setItem('supabase.auth.token', 'x')
    localStorage.setItem('supabase.auth.token-user', 'y')
    localStorage.setItem(derivedKey, 'z')
    const useSupabase = await loadUseSupabase()
    useSupabase()
    expect(localStorage.getItem('supabase.auth.token')).toBeNull()
    expect(localStorage.getItem('supabase.auth.token-user')).toBeNull()
    expect(localStorage.getItem(derivedKey)).toBeNull()
  })

  it('浏览器（非 Electron）不清理 localStorage（避免误删当前会话）', async () => {
    localStorage.setItem('supabase.auth.token', 'x')
    const useSupabase = await loadUseSupabase()
    useSupabase()
    expect(localStorage.getItem('supabase.auth.token')).toBe('x')
  })

  it('多次调用返回同一 client 实例', async () => {
    const useSupabase = await loadUseSupabase()
    expect(useSupabase()).toBe(useSupabase())
  })
})
