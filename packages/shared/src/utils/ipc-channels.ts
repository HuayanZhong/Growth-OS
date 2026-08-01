/**
 * IPC 通道类型映射 —— Electron 主进程与渲染进程共享的类型契约。
 *
 * 设计要点：
 * - key = 通道名（与 `ipcMain.handle` / `ipcRenderer.invoke` 第一参数一致）
 * - value = `{ request, response }`，分别对应请求参数与返回值类型
 * - `main.ts` 的 `handleIpc` 与 `preload.ts` 的 `invokeIpc` 均基于此映射派生签名
 * - `DesktopAPI` 也由此映射派生，确保 `window.desktop` 与底层通道一致
 *
 * 新增 IPC 通道时只需在此添加一行，三端类型自动同步。
 */

/**
 * IPC 通道映射表。
 * 每个条目描述一个 `ipcMain.handle` / `ipcRenderer.invoke` 通道的请求与响应类型。
 *
 * key 同时作为 IPC 通道名（传给 `ipcMain.handle` / `ipcRenderer.invoke`）和
 * 暴露给 `window.desktop` 的方法名。这样三端（main / preload / types）共享同一份契约，
 * 新增/重命名通道时编译期即可发现遗漏。
 */
export interface IpcChannelMap {
  /** 获取 Electron 应用版本号 */
  version: {
    request: void
    response: string
  }
}

/** 所有 IPC 通道名（字符串字面量联合类型） */
export type IpcChannelName = keyof IpcChannelMap

/** 指定通道的请求参数类型 */
export type IpcRequest<TChannel extends IpcChannelName> = IpcChannelMap[TChannel]['request']

/** 指定通道的响应类型 */
export type IpcResponse<TChannel extends IpcChannelName> = IpcChannelMap[TChannel]['response']

/**
 * 从 `IpcChannelMap` 派生的桌面端 API 类型，对应 `window.desktop`。
 *
 * - `request: void` → 无参函数 `() => Promise<response>`
 * - 否则 → 单参函数 `(request) => Promise<response>`
 *
 * `preload.ts` 中的 `contextBridge.exposeInMainWorld('desktop', api)` 应符合此类型，
 * 任何通道签名变更都会在编译期同步暴露给渲染进程。
 */
export type DesktopAPI = {
  [K in IpcChannelName]: IpcRequest<K> extends void
    ? () => Promise<IpcResponse<K>>
    : (request: IpcRequest<K>) => Promise<IpcResponse<K>>
}
