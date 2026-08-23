/**
 * Electron preload 暴露给渲染进程的桌面端 API 类型。
 *
 * 类型由 `@growth-os/types` 的 `DesktopAPI` 派生（基于 `IpcChannelMap`），
 * 与主进程 `ipc/`（handler）及 `preload/`（桥接实现）共享同一类型契约。
 *
 * 渲染进程中通过 `window.desktop` 调用。新增通道只需修改 `IpcChannelMap`，
 * 此文件无需改动。
 */
declare global {
  interface Window {
    desktop: import('@growth-os/types').DesktopAPI
  }
}
