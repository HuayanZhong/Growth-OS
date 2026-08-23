/**
 * 自动更新（electron-updater）。
 *
 * 策略（对应 P3 #17/#18）：
 * - 启动后延迟检查（避免与启动初始化竞争资源）
 * - 自动下载（autoUpdater 默认行为）
 * - 退出应用时自动安装已下载的更新
 * - 手动入口：渲染进程通过 IPC checkForUpdates 查询状态、quitAndInstall 触发安装
 * - 仅在打包模式（app.isPackaged）下生效，dev 模式 electron-updater 会跳过
 * - 更新源与签名配置见 packages/desktop-core/electron-builder.yml
 */
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateInfo } from 'electron-updater'
import type { UpdateCheckResult } from '@growth-os/types'

const LOG_TAG = '[desktop-core]'

// 当前更新状态，由 autoUpdater 事件驱动维护，供 IPC checkForUpdates 同步返回
let updateAvailable = false
let updateDownloaded = false
let pendingUpdateVersion: string | null = null
let pendingReleaseNotes: string | null = null
// 防止启动检查与手动检查并发触发重复事件
let isChecking = false

/** 汇总当前更新状态供 IPC 返回 */
function currentUpdateStatus(): UpdateCheckResult {
  return {
    available: updateAvailable,
    version: pendingUpdateVersion,
    releaseNotes: pendingReleaseNotes,
    downloaded: updateDownloaded,
  }
}

/**
 * 初始化 autoUpdater 配置与事件监听。由 `ipc/index.ts` 的 `registerIpc` 调用。
 */
export function setupAutoUpdater(): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    updateAvailable = true
    pendingUpdateVersion = info.version ?? null
    pendingReleaseNotes = typeof info.releaseNotes === 'string' ? info.releaseNotes : null
    console.log(LOG_TAG, '发现新版本:', info.version)
  })

  autoUpdater.on('update-not-available', () => {
    updateAvailable = false
    console.log(LOG_TAG, '当前版本已是最新')
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    updateDownloaded = true
    pendingUpdateVersion = info.version ?? null
    console.log(LOG_TAG, '更新已下载，将在退出时安装。版本:', info.version)
  })

  autoUpdater.on('error', (err: unknown) => {
    console.error(LOG_TAG, '自动更新错误:', err)
  })
}

/** 手动检查更新入口（IPC checkForUpdates handler） */
export async function checkForUpdatesHandler(): Promise<UpdateCheckResult> {
  // dev 模式或未打包时直接返回无更新，避免 electron-updater 抛错
  if (!app.isPackaged) {
    return currentUpdateStatus()
  }
  // 已在检查中（启动时自动触发或用户连续点击），返回当前状态避免重复触发
  if (isChecking) {
    return currentUpdateStatus()
  }
  isChecking = true
  try {
    await autoUpdater.checkForUpdates()
    return currentUpdateStatus()
  } catch (err) {
    console.error(LOG_TAG, '手动检查更新失败:', err)
    return currentUpdateStatus()
  } finally {
    isChecking = false
  }
}

/** 退出并安装已下载的更新（IPC quitAndInstall handler） */
export function quitAndInstallHandler(): void {
  if (updateDownloaded) {
    autoUpdater.quitAndInstall()
  }
  // 未下载完毕时无操作，避免触发 electron-updater 报错
}

/** 启动后延迟检查更新（仅打包模式），由 bootstrap 在应用就绪后调用 */
export function checkForUpdatesOnStartup(): void {
  setTimeout(() => {
    isChecking = true
    autoUpdater
      .checkForUpdatesAndNotify()
      .catch((err) => {
        console.error(LOG_TAG, '启动时检查更新失败:', err)
      })
      .finally(() => {
        isChecking = false
      })
  }, 5000)
}
