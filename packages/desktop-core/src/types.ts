/**
 * Electron preload 暴露给渲染进程的桌面端 API 类型。
 * 渲染进程中通过 `window.desktop` 调用。
 */
export interface DesktopAPI {
  /** 获取 Electron 应用版本号 */
  version: () => Promise<string>;
}

declare global {
  interface Window {
    desktop: DesktopAPI;
  }
}
