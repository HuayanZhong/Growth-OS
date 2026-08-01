// 重新导出 zod，让消费方无需直接依赖 zod，避免版本漂移
export { z } from 'zod';

export {
  EnvError,
  parseEnv,
  envString,
  envOptionalString,
  envUrlString,
  envIntString,
  envNonNegativeIntString,
  envBoolString,
} from './env.ts';

export { normalizeBaseUrl, normalizePrefix, joinUrl } from './normalize.ts';

export {
  type IpcChannelMap,
  type IpcChannelName,
  type IpcRequest,
  type IpcResponse,
  type DesktopAPI,
} from './utils/ipc-channels.ts';
