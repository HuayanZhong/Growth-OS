/**
 * Supabase 自定义 storage adapter：session 不落 localStorage。
 *
 * - Electron 环境：经 `window.desktop.secureStore` IPC 交给主进程，
 *   safeStorage（OS 级加密）加密后落盘，localStorage 不再出现明文 token
 * - 纯浏览器（web 预览 / 测试，无 Electron preload）：fallback localStorage
 * - 持久化前裁剪 session：剥离 user 全量 PII（identities/app_metadata 等），
 *   磁盘只保留 token 字段 + 最小 user（id/email/avatar_url）
 */

/** 兼容 Supabase SupportedStorage 的结构化类型（async 实现） */
interface SecureStorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: string) => void | Promise<void>
  removeItem: (key: string) => void | Promise<void>
}

function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.desktop?.secureStore)
}

export { isElectron }

/**
 * 裁剪 session JSON：只保留 token 相关字段与最小 user 信息。
 * 解析失败（非 session 数据）时原样返回，不阻断存储。
 */
function trimSession(value: string): string {
  try {
    const session = JSON.parse(value) as Record<string, unknown>
    if (!session || typeof session !== 'object') return value

    const user = session.user
    if (user && typeof user === 'object') {
      const u = user as Record<string, unknown>
      session.user = {
        id: u.id,
        ...(u.email !== undefined ? { email: u.email } : {}),
        ...(u.avatar_url !== undefined ? { avatar_url: u.avatar_url } : {}),
      }
    }
    return JSON.stringify(session)
  } catch {
    return value
  }
}

export const secureStorage: SecureStorageAdapter = {
  async getItem(key) {
    if (!isElectron()) return localStorage.getItem(key)
    try {
      return await window.desktop.secureStore({ action: 'get', key })
    } catch (err) {
      // IPC 异常视为未登录：不阻断应用，仅本轮会话无法恢复
      console.error('[auth] secureStore getItem 失败:', key, err)
      return null
    }
  },

  async setItem(key, value) {
    if (!isElectron()) {
      localStorage.setItem(key, value)
      return
    }
    try {
      await window.desktop.secureStore({ action: 'set', key, value: trimSession(value) })
    } catch (err) {
      // 持久化失败不阻断登录：session 在内存中仍有效（signIn 成功即可用），
      // 仅重启后需重新登录。auth-js 的 storage 异常会直接 throw 冒泡，必须在此兜住。
      console.error('[auth] secureStore setItem 失败，session 不持久化:', key, err)
    }
  },

  async removeItem(key) {
    if (!isElectron()) {
      localStorage.removeItem(key)
      return
    }
    try {
      await window.desktop.secureStore({ action: 'remove', key })
    } catch (err) {
      console.error('[auth] secureStore removeItem 失败:', key, err)
    }
  },
}
