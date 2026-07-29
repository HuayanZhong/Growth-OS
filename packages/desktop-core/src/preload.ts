import { contextBridge, ipcRenderer } from "electron";

/**
 * 通过 contextBridge 向渲染进程暴露安全的 IPC 接口。
 * 渲染进程通过 `window.desktop` 访问，所有底层 Node.js / Electron API 均不暴露。
 * 如需新增 IPC 通道，在此处添加方法并在 main.ts 中添加对应的 ipcMain.handle。
 */
contextBridge.exposeInMainWorld("desktop", {
  version: () => ipcRenderer.invoke("get-version"),
});
