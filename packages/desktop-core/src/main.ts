import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ESM 环境下 __dirname 需要手动构造
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,  // 开启上下文隔离，防止预加载脚本污染渲染进程
      nodeIntegration: false,  // 禁止渲染进程直接访问 Node.js API
    },
  });

  // 生产模式加载 Nuxt 构建产物，开发模式连接 Nuxt dev server
  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "../../apps/desktop/.output/public/index.html"));
  } else {
    win.loadURL("http://localhost:3000");
  }
}

// IPC handlers —— 渲染进程通过 preload 中的 ipcRenderer.invoke 调用
ipcMain.handle("get-version", () => app.getVersion());

app.whenReady().then(createWindow);

// macOS 下关闭窗口不退出应用（符合平台惯例）
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
