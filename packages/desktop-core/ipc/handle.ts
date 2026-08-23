/**
 * 类型安全的 IPC handler 注册。
 *
 * 基于 `IpcChannelMap` 派生 handler 签名，通道名拼写错误、参数/返回类型
 * 不匹配会在编译期暴露。
 *
 * 新增通道：在 `@growth-os/types` 的 `IpcChannelMap` 添加条目后，
 * 调用 `handleIpc('通道名', handler)` 注册。
 */
import { ipcMain } from 'electron'
import type { IpcChannelName, IpcRequest, IpcResponse } from '@growth-os/types'

export function handleIpc<TChannel extends IpcChannelName>(
  channel: TChannel,
  handler: (
    request: IpcRequest<TChannel>,
  ) => Promise<IpcResponse<TChannel>> | IpcResponse<TChannel>,
): void {
  ipcMain.handle(channel, (_event, request) => handler(request))
}
