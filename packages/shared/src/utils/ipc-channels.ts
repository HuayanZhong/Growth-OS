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
 * 应用更新检查结果。
 *
 * 由 `autoUpdater.checkForUpdates()` 的返回值简化而来，
 * 去掉对渲染进程无意义的内部字段（如 updateInfo 对象、CancellationToken 等）。
 */
export interface UpdateCheckResult {
  /** 是否有可用更新 */
  available: boolean
  /** 最新版本号（无更新时为 null） */
  version: string | null
  /** 发布说明（无更新或非字符串时为 null） */
  releaseNotes: string | null
  /** 是否已下载完毕，可调用 quitAndInstall 安装 */
  downloaded: boolean
}

/**
 * IPC 通道映射表。
 * 每个条目描述一个 `ipcMain.handle` / `ipcRenderer.invoke` 通道的请求与响应类型。
 *
 * key 同时作为 IPC 通道名（传给 `ipcMain.handle` / `ipcRenderer.invoke`）和
 * 暴露给 `window.desktop` 的方法名。这样三端（main / preload / types）共享同一份契约，
 * 新增/重命名通道时编译期即可发现遗漏。
 *
 * 命名约定：使用驼峰式（如 `checkForUpdates`），便于渲染进程点号访问 `window.desktop.checkForUpdates()`。
 */
export interface IpcChannelMap {
  /** 获取 Electron 应用版本号 */
  version: {
    request: void
    response: string
  }
  /** 检查应用更新（手动入口）。返回当前更新状态，不阻塞下载流程。 */
  checkForUpdates: {
    request: void
    response: UpdateCheckResult
  }
  /** 退出应用并安装已下载的更新。若未下载完毕则无操作。 */
  quitAndInstall: {
    request: void
    response: void
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
