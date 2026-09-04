/**
 * handleIpc 单测（test/ipc/x.test.ts 对应 ipc/x.ts）。
 * mock `electron` 的 ipcMain，验证通道注册与请求转发。
 * 注意：handleIpc 的包装函数不是 async——同步 handler 返回值原样透传，异步 handler 返回 Promise。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ipcMain } from 'electron'
import type { IpcRequest } from '@growth-os/types'
import { handleIpc } from '../../ipc/handle.ts'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}))

const mockHandle = vi.mocked(ipcMain.handle)

/** ipcMain.handle 回调首参在测试里无实际用途，最小化构造 */
const fakeEvent = {} as Electron.IpcMainInvokeEvent

describe('handleIpc', () => {
  beforeEach(() => {
    mockHandle.mockClear()
  })

  it('把通道名和包装函数注册到 ipcMain.handle', () => {
    handleIpc('version', () => 'ok')

    expect(mockHandle).toHaveBeenCalledWith('version', expect.any(Function))
  })

  it('异步 handler：包装函数透传请求并返回其 Promise', async () => {
    const handler = vi.fn(async (request: IpcRequest<'secureStore'>) => request.key)
    handleIpc('secureStore', handler)

    const wrapped = mockHandle.mock.calls[0]![1]
    const request: IpcRequest<'secureStore'> = { action: 'get', key: 'k1' }

    await expect(wrapped(fakeEvent, request)).resolves.toBe('k1')
    expect(handler).toHaveBeenCalledWith(request)
  })

  it('同步 handler：返回值原样透传（不包 Promise）', () => {
    handleIpc('version', () => '9.9.9')

    const wrapped = mockHandle.mock.calls[0]![1]

    expect(wrapped(fakeEvent, undefined)).toBe('9.9.9')
  })
})
