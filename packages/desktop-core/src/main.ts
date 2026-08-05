import { app, BrowserWindow, ipcMain, Menu, safeStorage } from 'electron'
import type { WebContents } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateInfo } from 'electron-updater'
import type { IpcChannelName, IpcRequest, IpcResponse, UpdateCheckResult } from '@growth-os/types'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM 环境下 __dirname 需要手动构造
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 统一日志前缀，便于在终端/打包后日志文件中过滤
const LOG_TAG = '[desktop-core]'

/**
 * 类型安全的 IPC handler 注册。
 *
 * 基于 `IpcChannelMap` 派生 handler 签名，通道名拼写错误、参数/返回类型
 * 不匹配会在编译期暴露。
 *
 * 新增通道：在 `@growth-os/types` 的 `IpcChannelMap` 添加条目后，
 * 调用 `handleIpc('通道名', handler)` 注册。
 */
function handleIpc<TChannel extends IpcChannelName>(
  channel: TChannel,
  handler: (
    request: IpcRequest<TChannel>,
  ) => Promise<IpcResponse<TChannel>> | IpcResponse<TChannel>,
): void {
  ipcMain.handle(channel, (_event, request) => handler(request))
}

function createWindow() {
  // preload.cjs 与 main.js 编译到同一 outDir 下。
  // 扩展名 .cjs：Electron sandbox 的 preload 只支持 CJS，且须避开 package.json "type": "module" 的 ESM 解析
  const preloadPath = path.join(__dirname, 'preload.cjs')

  // 移除默认菜单栏（File, Edit, View, Window, Help）
  Menu.setApplicationMenu(null)

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath,
      // 开启上下文隔离，preload 中通过 contextBridge 暴露有限 API，防止渲染进程直接访问 Node.js
      contextIsolation: true,
      // 禁止渲染进程直接访问 Node.js API，所有 Node 能力通过 preload 中的 ipcRenderer 桥接
      nodeIntegration: false,
    },
  })

  // 开发模式：F12 / Ctrl+Shift+I 切换 DevTools（菜单栏已移除，需手动注册）
  if (!app.isPackaged) {
    win.webContents.on('before-input-event', (event, input) => {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key.toLowerCase() === 'i')
      ) {
        win.webContents.toggleDevTools()
        event.preventDefault()
      }
    })
  }

  // VITE_DEV_SERVER_URL 由 vite-plugin-electron 注入，仅在开发模式下可用
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL).catch((err) => {
      console.error(LOG_TAG, '加载开发服务器 URL 失败:', err)
    })
  } else {
    // 生产模式加载 Nuxt 构建产物
    // - 开发调试（直接 node 运行）：相对于 packages/desktop-core/dist → apps/desktop/.output/public/index.html
    // - 打包后（electron-builder）：process.resourcesPath/public/index.html
    const htmlPath = app.isPackaged
      ? path.join(process.resourcesPath, 'public', 'index.html')
      : path.join(__dirname, '../../../apps/desktop/.output/public/index.html')

    win.loadFile(htmlPath).catch((err) => {
      console.error(LOG_TAG, '加载生产构建文件失败:', err)
    })
  }
}

// IPC handlers —— 渲染进程通过 preload 中的 ipcRenderer.invoke 调用
handleIpc('version', () => app.getVersion())

// ============================================================
// 安全存储（secureStore）
//
// 用途：持久化 Supabase session 等敏感数据。localStorage 明文存 token 已被
// 逐步淘汰，渲染进程通过 `window.desktop.secureStore` 把数据交给主进程，
// 用 safeStorage（OS 级加密：Win=DPAPI / macOS=Keychain / Linux=libsecret）
// 加密后落盘 `<userData>/secure-store/<sha256(key)>.enc`。
//
// 安全边界：
// - safeStorage 不可用（如 Linux 无 keyring）时不落盘，返回 null —— 会话不
//   持久化（重启需重新登录），而不是退化为明文存储
// - 磁盘上只有密文，明文仅短暂存在于主进程内存
// ============================================================

handleIpc('secureStore', async ({ action, key, value }) => {
  if (!safeStorage.isEncryptionAvailable()) {
    console.error(LOG_TAG, 'safeStorage 不可用（Linux 可能未配置 keyring），session 不持久化')
    return null
  }

  const dir = path.join(app.getPath('userData'), 'secure-store')
  const file = path.join(dir, `${createHash('sha256').update(key).digest('hex')}.enc`)

  try {
    switch (action) {
      case 'get': {
        if (!existsSync(file)) return null
        // Electron 43+ 异步 API 返回 { result, isBackupDecrypted }，取 result 字段
        const { result } = await safeStorage.decryptStringAsync(readFileSync(file))
        return result
      }
      case 'set': {
        if (value === undefined) return null
        mkdirSync(dir, { recursive: true })
        writeFileSync(file, await safeStorage.encryptStringAsync(value))
        return null
      }
      case 'remove': {
        rmSync(file, { force: true })
        return null
      }
      default:
        return null
    }
  } catch (err) {
    console.error(LOG_TAG, 'secureStore 操作失败:', action, key, err)
    return null
  }
})

// ============================================================
// 自动更新（electron-updater）
//
// 策略（对应 P3 #17/#18）：
// - 启动后延迟检查（避免与启动初始化竞争资源）
// - 自动下载（autoUpdater 默认行为）
// - 退出应用时自动安装已下载的更新
// - 手动入口：渲染进程通过 IPC checkForUpdates 查询状态、quitAndInstall 触发安装
// - 仅在打包模式（app.isPackaged）下生效，dev 模式 electron-updater 会跳过
// - 更新源与签名配置见 packages/desktop-core/electron-builder.yml
// ============================================================

// 当前更新状态，由 autoUpdater 事件驱动维护，供 IPC checkForUpdates 同步返回
let updateAvailable = false
let updateDownloaded = false
let pendingUpdateVersion: string | null = null
let pendingReleaseNotes: string | null = null
// 防止启动检查与手动检查并发触发重复事件
let isChecking = false

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

/** 汇总当前更新状态供 IPC 返回 */
function currentUpdateStatus(): UpdateCheckResult {
  return {
    available: updateAvailable,
    version: pendingUpdateVersion,
    releaseNotes: pendingReleaseNotes,
    downloaded: updateDownloaded,
  }
}

// 手动检查更新入口
handleIpc('checkForUpdates', async (): Promise<UpdateCheckResult> => {
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
})

// 退出并安装已下载的更新
handleIpc('quitAndInstall', () => {
  if (updateDownloaded) {
    autoUpdater.quitAndInstall()
  }
  // 未下载完毕时无操作，避免触发 electron-updater 报错
})

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

app
  .whenReady()
  .then(() => {
    createWindow()

    // 启动后延迟检查更新（仅打包模式）：
    // - 延迟 5s 避免与启动初始化竞争资源
    // - checkForUpdatesAndNotify 会在后台下载，下载完毕后由 update-downloaded 事件处理
    if (app.isPackaged) {
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
  })
  .catch((err) => {
    console.error(LOG_TAG, 'Electron 初始化失败:', err)
  })

// macOS 惯例：关闭所有窗口不退出应用，用户可再次点击 Dock 图标重新创建窗口
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
