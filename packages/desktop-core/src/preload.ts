/**
 * Electron preload 脚本入口。
 *
 * 实现已拆分至 `../preload`，此处仅转导出 `api`（模块副作用即执行
 * contextBridge 暴露），保持 `apps/desktop/modules/electron.ts` 的构建入口路径不变。
 */
export { api } from '../preload/index.ts'
