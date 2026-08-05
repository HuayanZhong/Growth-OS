import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { secureStorage } from '~/composables/useSecureStorage'

// 模块级单例：ssr:false 仅浏览器运行，不会跨请求共享，安全
let client: SupabaseClient | null = null

// auth-js 默认 storageKey（storageKey 未自定义时的默认值，含旧版 '-user' 后缀键）
const LEGACY_STORAGE_KEYS = ['supabase.auth.token', 'supabase.auth.token-user']

/**
 * 清除历史版本明文存 localStorage 的 session 残留。
 * 安全存储接入后 token 不再明文落盘；旧残留一次性清理（用户重新登录一次），
 * 避免过期明文 token 长期驻留磁盘。
 */
function clearLegacyLocalStorageSession(): void {
  if (typeof localStorage === 'undefined') return
  for (const key of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(key)
  }
}

/**
 * Supabase 客户端单例。
 * 从 runtimeConfig.public 读取 url/key，auto-import 全局可用。
 * session 经 secureStorage 持久化（Electron 走主进程 safeStorage 加密，见 useSecureStorage.ts）。
 */
export function useSupabase(): SupabaseClient {
  if (client) return client
  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
  clearLegacyLocalStorageSession()
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: secureStorage,
    },
  })
  return client
}
