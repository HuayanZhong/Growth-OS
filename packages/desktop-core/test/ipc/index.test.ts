/**
 * registerIpc 单测（test/ipc/x.test.ts 对应 ipc/x.ts）。
 * mock electron 与各通道 handler 模块，验证接线完整性：
 * 4 个通道全部注册、setupAutoUpdater 被调用、version 通道返回 app.getVersion。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app, ipcMain } from 'electron'
import { registerIpc } from '../../ipc/index.ts'
import { setupAutoUpdater } from '../../ipc/updates.ts'

vi.mock('electron', () => ({
  app: { getVersion: vi.fn(() => '0.0.0-test') },
  ipcMain: { handle: vi.fn() },
}))

vi.mock('../../ipc/secure-store.ts', () => ({ secureStoreHandler: vi.fn() }))
vi.mock('../../ipc/updates.ts', () => ({
  setupAutoUpdater: vi.fn(),
  checkForUpdatesHandler: vi.fn(),
  quitAndInstallHandler: vi.fn(),
}))

const mockHandle = vi.mocked(ipcMain.handle)

beforeEach(() => {
  mockHandle.mockClear()
  vi.mocked(setupAutoUpdater).mockClear()
})

/** ipcMain.handle 回调首参在测试里无实际用途，最小化构造 */
const fakeEvent = {} as Electron.IpcMainInvokeEvent

describe('registerIpc', () => {
  it('初始化自动更新状态机', () => {
    registerIpc()

    expect(setupAutoUpdater).toHaveBeenCalledTimes(1)
  })

  it('注册全部 4 个 IPC 通道', () => {
    registerIpc()

    const channels = mockHandle.mock.calls.map(([channel]) => channel)
    expect(channels).toEqual(['version', 'secureStore', 'checkForUpdates', 'quitAndInstall'])
  })

  it('version 通道返回 app.getVersion()（同步返回值原样透传）', () => {
    registerIpc()

    const call = mockHandle.mock.calls.find(([channel]) => channel === 'version')!

    expect(call[1](fakeEvent, undefined)).toBe('0.0.0-test')
    expect(app.getVersion).toHaveBeenCalled()
  })
})
