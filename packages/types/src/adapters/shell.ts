/**
 * Shell 能力适配器契约（迭代计划 2.1）。
 *
 * 抽象桌面壳能力（Electron）：现实现是 preload 暴露的 window.desktop
 * （IpcChannelMap 各通道的转发）；web 预览模式注册降级实现
 * （secureStore 回退 localStorage、更新能力为空操作）。
 * 调用方据此隔离"是否在 Electron 内"的分支判断。
 */
import type { UpdateCheckResult } from '../utils/ipc-channels.ts'

/** 安全存储：OS 级加密持久化（session 等敏感数据），见 secureStore 通道契约 */
export interface ShellSecureStore {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

export interface ShellAdapter {
  /** Electron 壳内为 true；浏览器预览为 false（调用方据此选择降级实现） */
  readonly isElectron: boolean
  /** 应用版本号（亦作 Sentry release 等元数据来源） */
  getVersion(): Promise<string>
  secureStore: ShellSecureStore
  /** 手动检查更新；返回当前更新状态，不阻塞下载流程 */
  checkForUpdates(): Promise<UpdateCheckResult>
  /** 退出并安装已下载的更新；未下载完毕时无操作 */
  quitAndInstall(): void
}
