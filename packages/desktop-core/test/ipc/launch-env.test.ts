import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { launchEnvHandler } from '../../ipc/launch-env.ts'

/**
 * launchEnv 通道 handler：只收集白名单内且非空的 NUXT_PUBLIC_* 变量，
 * secret 与空值一律不进载荷。
 *
 * 用例间清空白名单变量：真实 process.env 可能带 .env 注入的
 * NUXT_PUBLIC_*（turbo 经 dotenv 链注入），断言不依赖外部环境状态。
 */
const ALLOWLIST_KEYS = [
  'NUXT_PUBLIC_SUPABASE_URL',
  'NUXT_PUBLIC_SUPABASE_ANON_KEY',
  'NUXT_PUBLIC_API_BASE_URL',
  'NUXT_PUBLIC_APP_NAME',
  'NUXT_PUBLIC_SITE_URL',
] as const

/** 保存并清空白名单变量，返回恢复函数 */
function clearAllowlist(): () => void {
  const saved = new Map<string, string | undefined>()
  for (const key of ALLOWLIST_KEYS) {
    saved.set(key, process.env[key])
    delete process.env[key]
  }
  return () => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

describe('launchEnvHandler', () => {
  let restore: () => void

  beforeEach(() => {
    restore = clearAllowlist()
  })

  afterEach(() => {
    restore()
    vi.unstubAllEnvs()
  })

  it('只收集白名单内且非空的变量，非白名单 secret 不出现', () => {
    vi.stubEnv('NUXT_PUBLIC_API_BASE_URL', 'http://stub:4000')
    vi.stubEnv('NUXT_PUBLIC_APP_NAME', 'StubOS')
    vi.stubEnv('DATABASE_URL', 'postgres://secret-do-not-leak')
    vi.stubEnv('NUXT_PUBLIC_SITE_URL', '')

    const env = launchEnvHandler()

    expect(env).toEqual({
      NUXT_PUBLIC_API_BASE_URL: 'http://stub:4000',
      NUXT_PUBLIC_APP_NAME: 'StubOS',
    })
  })

  it('白名单变量全缺时返回空对象', () => {
    expect(launchEnvHandler()).toEqual({})
  })
})
