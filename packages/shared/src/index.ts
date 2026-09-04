// 重新导出 zod，让消费方无需直接依赖 zod，避免版本漂移
export { z } from 'zod'

export {
  EnvError,
  parseEnv,
  envString,
  envOptionalString,
  envUrlString,
  envIntString,
  envNonNegativeIntString,
  envBoolString,
} from './env.ts'

export { normalizeBaseUrl, normalizePrefix, joinUrl } from './normalize.ts'

export { deriveMessages, ProjectionError } from './session-events.ts'

// 注意：IPC 类型契约（IpcChannelMap/DesktopAPI 等）已迁至 @growth-os/types，
// 需要时从 '@growth-os/types' 导入。
