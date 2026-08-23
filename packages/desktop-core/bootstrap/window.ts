/**
 * 主窗口创建。
 *
 * 与 `bootstrap/index.ts`（应用生命周期）分离，仅负责 BrowserWindow 的
 * 实例化、preload 注入与页面加载。
 */
import { app, BrowserWindow, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM 环境下 __dirname 需要手动构造。运行时位于打包产物 dist/，
// 因此相对路径（preload、生产页面）以 dist 为基准。
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const LOG_TAG = '[desktop-core]'

export function createWindow(): void {
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
