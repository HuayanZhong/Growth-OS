/**
 * 安全存储（secureStore）IPC handler。
 *
 * 用途：持久化 Supabase session 等敏感数据。localStorage 明文存 token 已被
 * 逐步淘汰，渲染进程通过 `window.desktop.secureStore` 把数据交给主进程，
 * 用 safeStorage（OS 级加密：Win=DPAPI / macOS=Keychain / Linux=libsecret）
 * 加密后落盘 `<userData>/secure-store/<sha256(key)>.enc`。
 *
 * 安全边界：
 * - safeStorage 不可用（如 Linux 无 keyring）时不落盘，返回 null —— 会话不
 *   持久化（重启需重新登录），而不是退化为明文存储
 * - 磁盘上只有密文，明文仅短暂存在于主进程内存
 */
import { app, safeStorage } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { IpcRequest, IpcResponse } from '@growth-os/types'

const LOG_TAG = '[desktop-core]'

export async function secureStoreHandler({
  action,
  key,
  value,
}: IpcRequest<'secureStore'>): Promise<IpcResponse<'secureStore'>> {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error(LOG_TAG, 'safeStorage 不可用（Linux 可能未配置 keyring），session 不持久化')
    return null
  }

  const dir = path.join(app.getPath('userData'), 'secure-store')
  const file = path.join(dir, `${createHash('sha256').update(key).digest('hex')}.enc`)

  try {
    switch (action) {
      case 'get': {
        if (!existsSync(file)) return null
        // Electron 43+ 异步 API 返回 { result, shouldReEncrypt }，取 result 字段
        const { result } = await safeStorage.decryptStringAsync(readFileSync(file))
        return result
      }
      case 'set': {
        if (value === undefined) return null
        mkdirSync(dir, { recursive: true })
        writeFileSync(file, await safeStorage.encryptStringAsync(value))
        return null
      }
      case 'remove': {
        rmSync(file, { force: true })
        return null
      }
      default:
        return null
    }
  } catch (err) {
    console.error(LOG_TAG, 'secureStore 操作失败:', action, key, err)
    return null
  }
}
