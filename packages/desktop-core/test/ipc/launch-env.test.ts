import { afterEach, describe, expect, it, vi } from 'vitest'
import { launchEnvHandler } from '../../ipc/launch-env.ts'

/**
 * launchEnv 通道 handler：只收集白名单内且非空的 NUXT_PUBLIC_* 变量，
 * secret 与空值一律不进载荷。
 */
describe('launchEnvHandler', () => {
  afterEach(() => {
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
