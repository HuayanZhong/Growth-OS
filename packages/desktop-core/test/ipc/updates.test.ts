/**
 * 自动更新状态机单测（test/ipc/x.test.ts 对应 ipc/x.ts）。
 *
 * mock 策略：
 * - `electron-updater` 的 autoUpdater 用 EventEmitter 模拟：测试通过 emit 驱动事件，
 *   验证模块级状态的流转；checkForUpdates / checkForUpdatesAndNotify / quitAndInstall 为 vi.fn
 * - `electron` 只 mock `app.isPackaged`（打包/开发两种模式分支）
 * - updates.ts 持有模块级状态，用 `vi.resetModules()` + 动态 import 隔离用例间状态
 * - checkForUpdatesOnStartup 依赖 5s setTimeout，用 fake timers 驱动
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { EventEmitter } from 'node:events'
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

vi.mock('electron', () => ({
  app: { isPackaged: true },
}))

vi.mock('electron-updater', async () => {
  const { EventEmitter } = await import('node:events')
  const mockAutoUpdater = Object.assign(new EventEmitter(), {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    checkForUpdates: vi.fn(),
    checkForUpdatesAndNotify: vi.fn(),
    quitAndInstall: vi.fn(),
  })
  return { autoUpdater: mockAutoUpdater }
})

/** autoUpdater mock 的显式类型（EventEmitter + vi.fn 方法，避免 any） */
const mockUpdater = autoUpdater as unknown as EventEmitter & {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  checkForUpdates: Mock
  checkForUpdatesAndNotify: Mock
  quitAndInstall: Mock
}

/** electron app mock 的可变 isPackaged（Electron 类型里是只读，mock 对象实际可写） */
const mockApp = app as unknown as { isPackaged: boolean }

/** 每个用例加载全新模块实例，隔离模块级状态 */
async function loadUpdates() {
  vi.resetModules()
  return await import('../../ipc/updates.ts')
}

beforeEach(() => {
  mockUpdater.removeAllListeners()
  mockUpdater.autoDownload = false
  mockUpdater.autoInstallOnAppQuit = false
  mockUpdater.checkForUpdates.mockReset().mockResolvedValue(null)
  mockUpdater.checkForUpdatesAndNotify.mockReset().mockResolvedValue(null)
  mockUpdater.quitAndInstall.mockReset()
  mockApp.isPackaged = true
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('setupAutoUpdater', () => {
  it('开启自动下载与退出时安装', async () => {
    const { setupAutoUpdater } = await loadUpdates()
    setupAutoUpdater()

    expect(mockUpdater.autoDownload).toBe(true)
    expect(mockUpdater.autoInstallOnAppQuit).toBe(true)
  })

  it('update-available：置可用态并记录版本与字符串 releaseNotes', async () => {
    const { setupAutoUpdater, checkForUpdatesHandler } = await loadUpdates()
    setupAutoUpdater()

    mockUpdater.emit('update-available', { version: '2.0.0', releaseNotes: 'fix: bug' })
    const status = await checkForUpdatesHandler()

    expect(status.available).toBe(true)
    expect(status.version).toBe('2.0.0')
    expect(status.releaseNotes).toBe('fix: bug')
  })

  it('update-available：非字符串 releaseNotes 归一为 null', async () => {
    const { setupAutoUpdater, checkForUpdatesHandler } = await loadUpdates()
    setupAutoUpdater()

    mockUpdater.emit('update-available', { version: '2.0.0', releaseNotes: [{ note: 'x' }] })
    const status = await checkForUpdatesHandler()

    expect(status.available).toBe(true)
    expect(status.releaseNotes).toBeNull()
  })

  it('update-not-available：回退为不可用', async () => {
    const { setupAutoUpdater, checkForUpdatesHandler } = await loadUpdates()
    setupAutoUpdater()

    mockUpdater.emit('update-available', { version: '2.0.0', releaseNotes: 'n' })
    mockUpdater.emit('update-not-available')
    const status = await checkForUpdatesHandler()

    expect(status.available).toBe(false)
  })

  it('update-downloaded：置已下载态并记录版本', async () => {
    const { setupAutoUpdater, checkForUpdatesHandler } = await loadUpdates()
    setupAutoUpdater()

    mockUpdater.emit('update-downloaded', { version: '2.0.0' })
    const status = await checkForUpdatesHandler()

    expect(status.downloaded).toBe(true)
    expect(status.version).toBe('2.0.0')
  })

  it('error 事件只记日志，不抛出', async () => {
    const { setupAutoUpdater } = await loadUpdates()
    setupAutoUpdater()

    expect(() => mockUpdater.emit('error', new Error('network down'))).not.toThrow()
  })
})

describe('checkForUpdatesHandler', () => {
  it('未打包模式：直接返回当前状态，不触发 electron-updater', async () => {
    const { checkForUpdatesHandler } = await loadUpdates()
    mockApp.isPackaged = false

    const status = await checkForUpdatesHandler()

    expect(status).toEqual({
      available: false,
      version: null,
      releaseNotes: null,
      downloaded: false,
    })
    expect(mockUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('打包模式：调用 checkForUpdates 并返回事件驱动后的状态', async () => {
    const { setupAutoUpdater, checkForUpdatesHandler } = await loadUpdates()
    setupAutoUpdater()
    mockUpdater.checkForUpdates.mockImplementation(async () => {
      mockUpdater.emit('update-available', { version: '3.0.0', releaseNotes: null })
      return null
    })

    const status = await checkForUpdatesHandler()

    expect(mockUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
    expect(status.available).toBe(true)
    expect(status.version).toBe('3.0.0')
  })

  it('并发闸：检查进行中的第二次调用直接返回，不重复触发', async () => {
    const { checkForUpdatesHandler } = await loadUpdates()
    let resolveCheck!: () => void
    mockUpdater.checkForUpdates.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCheck = () => resolve(null)
        }),
    )

    const first = checkForUpdatesHandler()
    const second = await checkForUpdatesHandler()

    expect(mockUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
    expect(second.available).toBe(false)

    resolveCheck()
    await first
    expect(mockUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('checkForUpdates 拒绝时返回当前状态而非抛出', async () => {
    const { checkForUpdatesHandler } = await loadUpdates()
    mockUpdater.checkForUpdates.mockRejectedValue(new Error('offline'))

    const status = await checkForUpdatesHandler()

    expect(status.available).toBe(false)
  })
})

describe('quitAndInstallHandler', () => {
  it('已下载：调用 quitAndInstall', async () => {
    const { setupAutoUpdater, quitAndInstallHandler } = await loadUpdates()
    setupAutoUpdater()
    mockUpdater.emit('update-downloaded', { version: '2.0.0' })

    quitAndInstallHandler()

    expect(mockUpdater.quitAndInstall).toHaveBeenCalledTimes(1)
  })

  it('未下载：无操作，不触发 electron-updater', async () => {
    const { quitAndInstallHandler } = await loadUpdates()

    quitAndInstallHandler()

    expect(mockUpdater.quitAndInstall).not.toHaveBeenCalled()
  })
})

describe('checkForUpdatesOnStartup', () => {
  it('延迟 5 秒后调用 checkForUpdatesAndNotify，完成前处于检查中', async () => {
    vi.useFakeTimers()
    const { checkForUpdatesOnStartup, checkForUpdatesHandler } = await loadUpdates()
    checkForUpdatesOnStartup()

    let resolveNotify!: () => void
    mockUpdater.checkForUpdatesAndNotify.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveNotify = () => resolve(null)
        }),
    )

    await vi.advanceTimersByTimeAsync(4999)
    expect(mockUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(mockUpdater.checkForUpdatesAndNotify).toHaveBeenCalledTimes(1)

    // 检查进行中：手动入口被并发闸挡住
    await checkForUpdatesHandler()
    expect(mockUpdater.checkForUpdates).not.toHaveBeenCalled()

    resolveNotify()
    await vi.advanceTimersByTimeAsync(0)
  })

  it('checkForUpdatesAndNotify 拒绝时只记日志，且释放检查中标记', async () => {
    vi.useFakeTimers()
    const { checkForUpdatesOnStartup, checkForUpdatesHandler } = await loadUpdates()
    mockUpdater.checkForUpdatesAndNotify.mockRejectedValue(new Error('boom'))
    checkForUpdatesOnStartup()

    await vi.advanceTimersByTimeAsync(5000)
    // finally 释放 isChecking：手动检查恢复正常触发
    await checkForUpdatesHandler()
    expect(mockUpdater.checkForUpdates).toHaveBeenCalledTimes(1)
  })
})
