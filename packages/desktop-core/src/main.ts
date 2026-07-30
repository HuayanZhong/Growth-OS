import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM 环境下 __dirname 需要手动构造
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      console.error('[desktop-core] 加载开发服务器 URL 失败:', err);
    });
  } else {
    // 生产模式加载 Nuxt 构建产物
    // - 开发调试（直接 node 运行）：相对于 packages/desktop-core/dist → apps/desktop/.output/public/index.html
    // - 打包后（electron-builder）：process.resourcesPath/public/index.html
    const htmlPath = app.isPackaged
      ? path.join(process.resourcesPath, 'public', 'index.html')
      : path.join(__dirname, '../../../apps/desktop/.output/public/index.html');

    win.loadFile(htmlPath).catch((err) => {
      console.error('[desktop-core] 加载生产构建文件失败:', err);
    });
  }
}

// IPC handlers —— 渲染进程通过 preload 中的 ipcRenderer.invoke 调用
ipcMain.handle('get-version', () => app.getVersion());

app
  .whenReady()
  .then(createWindow)
  .catch((err) => {
    console.error('[desktop-core] Electron 初始化失败:', err);
  });

// macOS 惯例：关闭所有窗口不退出应用，用户可再次点击 Dock 图标重新创建窗口
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
