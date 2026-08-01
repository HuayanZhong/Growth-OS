import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopAPI, IpcChannelName, IpcRequest, IpcResponse } from '@growth-os/shared';

/**
 * 类型安全的 IPC 调用封装。
 *
 * 与 `main.ts` 的 `handleIpc` 共享 `IpcChannelMap`，确保两端通道名与类型一致。
 * - `request: void` 的通道调用时无需传参（`invokeIpc('version')`）
 * - 其他通道调用时传单个 request 参数
 */
async function invokeIpc<TChannel extends IpcChannelName>(
  channel: TChannel,
  ...args: IpcRequest<TChannel> extends void ? [] : [request: IpcRequest<TChannel>]
): Promise<IpcResponse<TChannel>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<IpcResponse<TChannel>>;
}

/**
 * 通过 contextBridge 向渲染进程暴露安全的 IPC 接口。
 * 渲染进程通过 `window.desktop` 访问，所有底层 Node.js / Electron API 均不暴露。
 *
 * `api` 标注为 `DesktopAPI`（从 `IpcChannelMap` 派生），与 main.ts 的 handler 共享契约。
 *
 * 新增 IPC 通道：
 * 1. 在 `@growth-os/shared` 的 `IpcChannelMap` 添加条目
 * 2. 在 `main.ts` 调用 `handleIpc('通道名', handler)`
 * 3. 在此处添加对应方法
 */
const api: DesktopAPI = {
  version: () => invokeIpc('version'),
};

contextBridge.exposeInMainWorld('desktop', api);
