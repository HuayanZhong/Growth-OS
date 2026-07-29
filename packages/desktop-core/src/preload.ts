import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  version: () => ipcRenderer.invoke("get-version"),
});
