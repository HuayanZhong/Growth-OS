/**
 * 主进程引导（bootstrap）：应用生命周期、全局错误处理与渲染进程崩溃恢复。
 *
 * - 窗口创建见 `./window.ts`
 * - IPC handler 注册见 `../ipc`（由 `src/main.ts` 在 `bootstrap()` 前调用）
 * - 启动时延迟检查更新由 `../ipc/updates.ts` 的 `checkForUpdatesOnStartup` 承担
 */
import { app } from 'electron'
import type { WebContents } from 'electron'
import { checkForUpdatesOnStartup } from '../ipc/updates.ts'
import { createWindow } from './window.ts'

const LOG_TAG = '[desktop-core]'

// ============================================================
// 全局错误处理
//
// Electron 主进程为单进程，未捕获的 Promise 拒绝 / 同步异常会影响后续行为。
// 此处集中记录日志，避免静默失败；UI 提示由渲染进程的 error.vue 承担。
// ============================================================

process.on('unhandledRejection', (reason) => {
  console.error(LOG_TAG, 'Unhandled promise rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error(LOG_TAG, 'Uncaught exception:', err)
  // 不立即 app.quit()：让当前窗口尽量保持可用，由用户决定是否重启。
  // 若主进程已不稳定，Electron 自身的 crash reporter 会接管。
})

// 渲染进程崩溃次数，达阈值后退出应用避免无限重建窗口
let renderCrashCount = 0
const MAX_RENDER_CRASHES = 3

app.on(
  'render-process-gone',
  (_event: unknown, webContents: WebContents, details: { reason: string }) => {
    console.error(LOG_TAG, 'Render process gone:', details.reason, 'url:', webContents.getURL())

    // clean-exit 不计数，仍尝试重建窗口（保持原有行为）
    if (details.reason !== 'clean-exit' && ++renderCrashCount >= MAX_RENDER_CRASHES) {
      console.error(LOG_TAG, '渲染进程连续崩溃次数过多，退出应用')
      app.exit(1)
      return
    }

    createWindow()
  },
)

// macOS 惯例：关闭所有窗口不退出应用，用户可再次点击 Dock 图标重新创建窗口
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 启动主进程：应用就绪后创建窗口，并在打包模式下延迟检查更新。
 *
 * 由 `src/main.ts` 在注册 IPC 后调用。
 */
export function bootstrap(): void {
  app
    .whenReady()
    .then(() => {
      createWindow()

      // 启动后延迟检查更新（仅打包模式）：
      // - 延迟 5s 避免与启动初始化竞争资源
      // - checkForUpdatesAndNotify 会在后台下载，下载完毕后由 update-downloaded 事件处理
      if (app.isPackaged) {
        checkForUpdatesOnStartup()
      }
    })
    .catch((err) => {
      console.error(LOG_TAG, 'Electron 初始化失败:', err)
    })
}
