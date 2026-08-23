/**
 * IPC handler 注册入口（主进程侧）。
 *
 * 各通道实现拆分如下：
 * - `./secure-store.ts` → secureStore（safeStorage 加密持久化）
 * - `./updates.ts`      → autoUpdater 状态机 + checkForUpdates / quitAndInstall
 * - 其余通道直接在此注册
 *
 * 通道契约（名称 / 请求 / 响应类型）统一来自 `@growth-os/types` 的 `IpcChannelMap`。
 */
import { app } from 'electron'
import { handleIpc } from './handle.ts'
import { secureStoreHandler } from './secure-store.ts'
import { checkForUpdatesHandler, quitAndInstallHandler, setupAutoUpdater } from './updates.ts'

/**
 * 注册全部 IPC handler。由 `src/main.ts` 在 `bootstrap()` 前调用。
 */
export function registerIpc(): void {
  // 初始化自动更新状态机（事件监听 + 配置）
  setupAutoUpdater()

  handleIpc('version', () => app.getVersion())
  handleIpc('secureStore', secureStoreHandler)
  handleIpc('checkForUpdates', checkForUpdatesHandler)
  handleIpc('quitAndInstall', quitAndInstallHandler)
}
