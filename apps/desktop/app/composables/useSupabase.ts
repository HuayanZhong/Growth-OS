import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isElectron, secureStorage } from '~/composables/useSecureStorage'

// 模块级单例：ssr:false 仅浏览器运行，不会跨请求共享，安全
let client: SupabaseClient | null = null

/**
 * supabase-js 各版本 storage key 格式：
 * - v2（当前）：sb-<project-ref>-auth-token（由 URL hostname 首段派生，见 SupabaseClient.ts）
 * - v1/早期 v2：supabase.auth.token（含 '-user' 后缀的 user 独立存储）
 * Electron 下 session 经 secureStore 走 IPC，localStorage 中出现上述 key 均为历史明文残留，
 * 一次性清理；纯浏览器 fallback 的清理由 isElectron 门控排除，避免误删当前会话。
 */
function legacyStorageKeys(supabaseUrl: string): string[] {
  let sbKey = ''
  try {
    sbKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
  } catch {
    // URL 解析失败时跳过，仅清理其余已知 key
  }
  return ['supabase.auth.token', 'supabase.auth.token-user', ...(sbKey ? [sbKey] : [])]
}

/**
 * 清除历史版本明文存 localStorage 的 session 残留。
 * 仅 Electron 环境执行：safeStorage 接入前 token 明文存 localStorage，接入后一次性清理。
 */
function clearLegacyLocalStorageSession(supabaseUrl: string): void {
  if (typeof localStorage === 'undefined') return
  if (!isElectron()) return
  for (const key of legacyStorageKeys(supabaseUrl)) {
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
  clearLegacyLocalStorageSession(supabaseUrl)
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
