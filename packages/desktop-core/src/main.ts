/**
 * Electron 主进程入口。
 *
 * 逻辑按职责拆分，此处仅装配：
 * - `../ipc`       → IPC handler 注册（handleIpc + 各通道实现）
 * - `../bootstrap` → 窗口创建、应用生命周期、全局错误处理
 *
 * 入口保持在此文件，`apps/desktop/modules/electron.ts` 的构建配置无需变更。
 */
import { bootstrap } from '../bootstrap/index.ts'
import { registerIpc } from '../ipc/index.ts'

// 先注册 IPC handler，再启动主进程（窗口创建依赖 preload，与 handler 无先后冲突）
registerIpc()
bootstrap()
