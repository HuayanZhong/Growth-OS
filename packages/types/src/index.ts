// @growth-os/types 包入口：整个 monorepo 的类型分发
// 包内只放跨包共享的类型契约（zod schema / IPC 契约等），不承载运行逻辑

export { z } from 'zod'

export { loginSchema, registerSchema } from './auth.ts'
export type { LoginInput, RegisterInput } from './auth.ts'

export type { ApiErrorEnvelope } from './api/error-envelope.ts'

export {
  type IpcChannelMap,
  type IpcChannelName,
  type IpcRequest,
  type IpcResponse,
  type DesktopAPI,
  type UpdateCheckResult,
} from './utils/ipc-channels.ts'
