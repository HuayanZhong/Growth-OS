import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import type { WebContents } from 'electron';
import type { IpcChannelName, IpcRequest, IpcResponse } from '@growth-os/shared';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM 环境下 __dirname 需要手动构造
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 统一日志前缀，便于在终端/打包后日志文件中过滤
const LOG_TAG = '[desktop-core]';

/**
 * 类型安全的 IPC handler 注册。
 *
 * 基于 `IpcChannelMap` 派生 handler 签名，通道名拼写错误、参数/返回类型
 * 不匹配会在编译期暴露。
 *
 * 新增通道：在 `@growth-os/shared` 的 `IpcChannelMap` 添加条目后，
 * 调用 `handleIpc('通道名', handler)` 注册。
 */
function handleIpc<TChannel extends IpcChannelName>(
  channel: TChannel,
  handler: (
    request: IpcRequest<TChannel>,
  ) => Promise<IpcResponse<TChannel>> | IpcResponse<TChannel>,
): void {
  ipcMain.handle(channel, (_event, request) => handler(request));
}

function createWindow() {
  // preload.js 与 main.js 编译到同一 outDir 下
  const preloadPath = path.join(__dirname, 'preload.js');

  // 移除默认菜单栏（File, Edit, View, Window, Help）
  Menu.setApplicationMenu(null);

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
  });

  // VITE_DEV_SERVER_URL 由 vite-plugin-electron 注入，仅在开发模式下可用
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL).catch((err) => {
      console.error(LOG_TAG, '加载开发服务器 URL 失败:', err);
    });
  } else {
    // 生产模式加载 Nuxt 构建产物
    // - 开发调试（直接 node 运行）：相对于 packages/desktop-core/dist → apps/desktop/.output/public/index.html
    // - 打包后（electron-builder）：process.resourcesPath/public/index.html
    const htmlPath = app.isPackaged
      ? path.join(process.resourcesPath, 'public', 'index.html')
      : path.join(__dirname, '../../../apps/desktop/.output/public/index.html');

    win.loadFile(htmlPath).catch((err) => {
      console.error(LOG_TAG, '加载生产构建文件失败:', err);
    });
  }
}

// IPC handlers —— 渲染进程通过 preload 中的 ipcRenderer.invoke 调用
handleIpc('version', () => app.getVersion());

// ============================================================
// 全局错误处理
//
// Electron 主进程为单进程，未捕获的 Promise 拒绝 / 同步异常会影响后续行为。
// 此处集中记录日志，避免静默失败；UI 提示由渲染进程的 error.vue 承担。
// ============================================================

process.on('unhandledRejection', (reason) => {
  console.error(LOG_TAG, 'Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error(LOG_TAG, 'Uncaught exception:', err);
  // 不立即 app.quit()：让当前窗口尽量保持可用，由用户决定是否重启。
  // 若主进程已不稳定，Electron 自身的 crash reporter 会接管。
});

app.on(
  'render-process-gone',
  (_event: unknown, webContents: WebContents, details: { reason: string }) => {
    console.error(LOG_TAG, 'Render process gone:', details.reason, 'url:', webContents.getURL());
    // 渲染进程崩溃后窗口已不可用，重建一个新窗口
    createWindow();
  },
);

app
  .whenReady()
  .then(createWindow)
  .catch((err) => {
    console.error(LOG_TAG, 'Electron 初始化失败:', err);
  });

// macOS 惯例：关闭所有窗口不退出应用，用户可再次点击 Dock 图标重新创建窗口
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
