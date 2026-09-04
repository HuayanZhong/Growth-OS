import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { isElectron, secureStorage, trimSession } from '~/composables/useSecureStorage'

/**
 * 安全存储 adapter 测试
 * 覆盖：trimSession PII 裁剪、浏览器 fallback（localStorage）、
 * Electron IPC 分支（加密通道 + 异常兜底）、isElectron 判定
 */
const SESSION = {
  access_token: 'at',
  refresh_token: 'rt',
  expires_at: 123,
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'u1',
    email: 'a@b.com',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'email' },
    user_metadata: { email: 'a@b.com' },
    identities: [{ identity_id: 'i1' }],
    created_at: '2026-01-01',
  },
}

describe('trimSession PII 裁剪', () => {
  it('user 只保留 id/email，token 三件套与 provider 字段保留', () => {
    const trimmed = JSON.parse(trimSession(JSON.stringify(SESSION)))
    expect(trimmed.access_token).toBe('at')
    expect(trimmed.refresh_token).toBe('rt')
    expect(trimmed.expires_at).toBe(123)
    expect(trimmed.user).toEqual({ id: 'u1', email: 'a@b.com' })
    // PII 字段全部剥离
    expect(trimmed.user).not.toHaveProperty('identities')
    expect(trimmed.user).not.toHaveProperty('app_metadata')
    expect(trimmed.user).not.toHaveProperty('user_metadata')
    expect(trimmed.user).not.toHaveProperty('aud')
    expect(trimmed.user).not.toHaveProperty('role')
  })

  it('user 有 avatar_url 时保留', () => {
    const withAvatar = { ...SESSION, user: { ...SESSION.user, avatar_url: 'https://x/av.png' } }
    const trimmed = JSON.parse(trimSession(JSON.stringify(withAvatar)))
    expect(trimmed.user).toEqual({ id: 'u1', email: 'a@b.com', avatar_url: 'https://x/av.png' })
  })

  it('user 无 email 时不写入空字段', () => {
    const noEmail = JSON.parse(JSON.stringify(SESSION))
    delete noEmail.user.email
    const trimmed = JSON.parse(trimSession(JSON.stringify(noEmail)))
    expect(trimmed.user).toEqual({ id: 'u1' })
  })

  it('非 JSON 数据原样返回，不阻断存储', () => {
    expect(trimSession('not-json')).toBe('not-json')
    expect(trimSession('{"broken"')).toBe('{"broken"')
  })
})

describe('isElectron', () => {
  beforeEach(() => {
    delete (window as unknown as { desktop?: unknown }).desktop
  })

  it('无 window.desktop 时为 false（浏览器模式）', () => {
    expect(isElectron()).toBe(false)
  })

  it('存在 window.desktop.secureStore 时为 true', () => {
    ;(window as unknown as { desktop?: unknown }).desktop = { secureStore: vi.fn() }
    expect(isElectron()).toBe(true)
  })
})

describe('secureStorage 浏览器 fallback（localStorage）', () => {
  beforeEach(() => {
    localStorage.clear()
    delete (window as unknown as { desktop?: unknown }).desktop
  })

  it('setItem/getItem/removeItem 走 localStorage', async () => {
    await secureStorage.setItem('k1', 'v1')
    expect(localStorage.getItem('k1')).toBe('v1')
    await expect(secureStorage.getItem('k1')).resolves.toBe('v1')
    await secureStorage.removeItem('k1')
    expect(localStorage.getItem('k1')).toBeNull()
  })
})

describe('secureStorage Electron IPC 分支', () => {
  const secureStoreMock = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    secureStoreMock.mockReset()
    ;(window as unknown as { desktop?: unknown }).desktop = { secureStore: secureStoreMock }
  })

  afterEach(() => {
    delete (window as unknown as { desktop?: unknown }).desktop
  })

  it('getItem 经 IPC 读取并返回解密值', async () => {
    secureStoreMock.mockResolvedValue('session-json')
    await expect(secureStorage.getItem('k1')).resolves.toBe('session-json')
    expect(secureStoreMock).toHaveBeenCalledWith({ action: 'get', key: 'k1' })
  })

  it('getItem IPC 异常返回 null（视为未登录，不阻断）', async () => {
    secureStoreMock.mockRejectedValue(new Error('ipc down'))
    await expect(secureStorage.getItem('k1')).resolves.toBeNull()
  })

  it('setItem 经 IPC 写入裁剪后的 session', async () => {
    secureStoreMock.mockResolvedValue(null)
    await secureStorage.setItem('k1', JSON.stringify(SESSION))
    expect(secureStoreMock).toHaveBeenCalledWith({
      action: 'set',
      key: 'k1',
      value: expect.not.stringContaining('identities'),
    })
    const sent = secureStoreMock.mock.calls[0]![0].value
    expect(JSON.parse(sent).user).toEqual({ id: 'u1', email: 'a@b.com' })
  })

  it('setItem IPC 异常被吞掉（持久化失败不阻断登录）', async () => {
    secureStoreMock.mockRejectedValue(new Error('disk full'))
    await expect(secureStorage.setItem('k1', 'v')).resolves.toBeUndefined()
  })

  it('removeItem 经 IPC 移除', async () => {
    secureStoreMock.mockResolvedValue(null)
    await secureStorage.removeItem('k1')
    expect(secureStoreMock).toHaveBeenCalledWith({ action: 'remove', key: 'k1' })
  })
})
