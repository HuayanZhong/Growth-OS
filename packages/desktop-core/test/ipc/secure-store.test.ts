/**
 * secureStore IPC handler 单测（test/ipc/x.test.ts 对应 ipc/x.ts）。
 *
 * mock 策略：
 * - `electron` 模块整体 mock（safeStorage 为可控行为的 vi.fn）
 * - node:fs / node:crypto 用真实实现，落盘到系统临时目录验证真实路径行为
 * - 加密以 `enc:<明文>` 前缀模拟：密文不含裸明文，且可逆用于往返断言
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { app, safeStorage } from 'electron'
import type { IpcRequest } from '@growth-os/types'
import { secureStoreHandler } from '../../ipc/secure-store.ts'

vi.mock('electron', () => ({
  app: { getPath: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: vi.fn(),
    encryptStringAsync: vi.fn(),
    decryptStringAsync: vi.fn(),
  },
}))

/** 请求快捷构造（value 缺省时不携带该字段，符合 exactOptionalPropertyTypes） */
function req(
  action: 'get' | 'set' | 'remove',
  key: string,
  value?: string,
): IpcRequest<'secureStore'> {
  return value === undefined ? { action, key } : { action, key, value }
}

/**
 * 模拟 OS 级加密：字符串反转 —— 密文不含明文子串（可断言"落盘非明文"），
 * 且可逆（可断言 set → get 往返一致）。
 */
function fakeEncrypt(plainText: string): Promise<Buffer> {
  return Promise.resolve(Buffer.from(plainText.split('').toReversed().join(''), 'utf8'))
}

function fakeDecrypt(encrypted: Buffer): Promise<{ result: string; shouldReEncrypt: boolean }> {
  return Promise.resolve({
    result: encrypted.toString('utf8').split('').toReversed().join(''),
    shouldReEncrypt: false,
  })
}

let userDataDir: string
let storeDir: string

/** 与 handler 的落盘规则一致：sha256(key).enc */
function fileFor(key: string): string {
  return path.join(storeDir, `${createHash('sha256').update(key).digest('hex')}.enc`)
}

beforeEach(() => {
  userDataDir = mkdtempSync(path.join(os.tmpdir(), 'secure-store-test-'))
  storeDir = path.join(userDataDir, 'secure-store')
  vi.mocked(app.getPath).mockReturnValue(userDataDir)
  vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true)
  vi.mocked(safeStorage.encryptStringAsync).mockImplementation(fakeEncrypt)
  vi.mocked(safeStorage.decryptStringAsync).mockImplementation(fakeDecrypt)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true })
  // clearAllMocks 清空 vi.fn 调用历史（restoreAllMocks 不清 history，会导致断言跨用例污染）
  vi.clearAllMocks()
  // restoreAllMocks 恢复 console.error 等 vi.spyOn 的原始实现
  vi.restoreAllMocks()
})

describe('secureStoreHandler', () => {
  describe('set', () => {
    it('加密落盘：文件名为 sha256(key).enc，内容为密文而非明文', async () => {
      const res = await secureStoreHandler(req('set', 'session-key', 'plain-secret'))

      expect(res).toBeNull()
      expect(safeStorage.encryptStringAsync).toHaveBeenCalledWith('plain-secret')
      expect(existsSync(fileFor('session-key'))).toBe(true)
      expect(readFileSync(fileFor('session-key'), 'utf8')).not.toContain('plain-secret')
    })

    it('value 缺省时拒绝写入，不创建存储目录', async () => {
      const res = await secureStoreHandler(req('set', 'session-key'))

      expect(res).toBeNull()
      expect(safeStorage.encryptStringAsync).not.toHaveBeenCalled()
      expect(existsSync(storeDir)).toBe(false)
    })

    it('不同 key 写入不同文件', async () => {
      await secureStoreHandler(req('set', 'key-a', 'a'))
      await secureStoreHandler(req('set', 'key-b', 'b'))

      expect(fileFor('key-a')).not.toBe(fileFor('key-b'))
      expect(readdirSync(storeDir)).toHaveLength(2)
    })
  })

  describe('get', () => {
    it('set → get 往返返回原值', async () => {
      await secureStoreHandler(req('set', 'session-key', 'payload'))

      const res = await secureStoreHandler(req('get', 'session-key'))
      expect(res).toBe('payload')
    })

    it('文件不存在时返回 null，不触发解密', async () => {
      const res = await secureStoreHandler(req('get', 'missing-key'))

      expect(res).toBeNull()
      expect(safeStorage.decryptStringAsync).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('删除对应文件，之后 get 返回 null', async () => {
      await secureStoreHandler(req('set', 'session-key', 'payload'))

      const res = await secureStoreHandler(req('remove', 'session-key'))
      expect(res).toBeNull()
      expect(existsSync(fileFor('session-key'))).toBe(false)
      expect(await secureStoreHandler(req('get', 'session-key'))).toBeNull()
    })

    it('key 不存在时不抛错（rmSync force）', async () => {
      const res = await secureStoreHandler(req('remove', 'missing-key'))
      expect(res).toBeNull()
    })
  })

  describe('safeStorage 不可用', () => {
    it('所有操作返回 null，不落盘（会话不持久化，避免明文退化）', async () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false)

      expect(await secureStoreHandler(req('set', 'session-key', 'secret'))).toBeNull()
      expect(await secureStoreHandler(req('get', 'session-key'))).toBeNull()
      expect(await secureStoreHandler(req('remove', 'session-key'))).toBeNull()

      expect(existsSync(storeDir)).toBe(false)
      expect(safeStorage.encryptStringAsync).not.toHaveBeenCalled()
    })
  })

  describe('异常路径', () => {
    it('加密失败返回 null 而非抛出', async () => {
      vi.mocked(safeStorage.encryptStringAsync).mockRejectedValue(new Error('dpapi failure'))

      const res = await secureStoreHandler(req('set', 'session-key', 'secret'))
      expect(res).toBeNull()
    })

    it('解密失败返回 null 而非抛出', async () => {
      await secureStoreHandler(req('set', 'session-key', 'payload'))
      vi.mocked(safeStorage.decryptStringAsync).mockRejectedValue(new Error('corrupt'))

      const res = await secureStoreHandler(req('get', 'session-key'))
      expect(res).toBeNull()
    })

    it('未知 action 返回 null（防御 default 分支）', async () => {
      const res = await secureStoreHandler({
        action: 'unknown',
        key: 'session-key',
      } as unknown as IpcRequest<'secureStore'>)
      expect(res).toBeNull()
    })
  })
})
