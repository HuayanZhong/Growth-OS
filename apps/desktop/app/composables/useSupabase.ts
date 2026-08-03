import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// 模块级单例：ssr:false 仅浏览器运行，不会跨请求共享，安全
let client: SupabaseClient | null = null

/**
 * Supabase 客户端单例。
 * 从 runtimeConfig.public 读取 url/key，auto-import 全局可用。
 */
export function useSupabase(): SupabaseClient {
  if (client) return client
  const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return client
}
