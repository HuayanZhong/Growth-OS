/**
 * preload 脚本实现：类型安全的 IPC 调用封装 + contextBridge 安全桥接。
 *
 * 由 `src/preload.ts` 入口转引入，保持 vite-plugin-electron 构建入口不变。
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopAPI, IpcChannelName, IpcRequest, IpcResponse } from '@growth-os/types'

/**
 * 类型安全的 IPC 调用封装。
 *
 * 与主进程 `ipc/handle.ts` 的 `handleIpc` 共享 `IpcChannelMap`，确保两端通道名与类型一致。
 * - `request: void` 的通道调用时无需传参（`invokeIpc('version')`）
 * - 其他通道调用时传单个 request 参数
 */
async function invokeIpc<TChannel extends IpcChannelName>(
  channel: TChannel,
  ...args: IpcRequest<TChannel> extends void ? [] : [request: IpcRequest<TChannel>]
): Promise<IpcResponse<TChannel>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<IpcResponse<TChannel>>
}

/**
 * 通过 contextBridge 向渲染进程暴露安全的 IPC 接口。
 * 渲染进程通过 `window.desktop` 访问，所有底层 Node.js / Electron API 均不暴露。
 *
 * `api` 标注为 `DesktopAPI`（从 `IpcChannelMap` 派生），与主进程 handler 共享契约。
 * 由 `src/preload.ts` 入口转导出（模块副作用即执行 contextBridge 暴露）。
 *
 * 新增 IPC 通道：
 * 1. 在 `@growth-os/types` 的 `IpcChannelMap` 添加条目
 * 2. 在 `ipc/` 中注册对应 handler（`registerIpc`）
 * 3. 在此处添加对应方法
 */
export const api: DesktopAPI = {
  version: () => invokeIpc('version'),
  checkForUpdates: () => invokeIpc('checkForUpdates'),
  quitAndInstall: () => invokeIpc('quitAndInstall'),
  secureStore: (request) => invokeIpc('secureStore', request),
}

contextBridge.exposeInMainWorld('desktop', api)
