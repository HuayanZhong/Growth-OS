// preload 通过 contextBridge 注入的桌面端 API 全局类型。
// 渲染进程（Nuxt app）可直接使用 window.desktop，签名由 IpcChannelMap 派生。
import type { DesktopAPI } from '@growth-os/types'

declare global {
  interface Window {
    desktop: DesktopAPI
  }
}
