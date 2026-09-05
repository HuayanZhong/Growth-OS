/**
 * launchEnv 通道 handler（迭代计划 2.4）。
 *
 * 把主进程启动时可用的 NUXT_PUBLIC_* 白名单变量交给渲染层：
 * 渲染层插件在应用装配前合并进 runtimeConfig，实现桌面端
 * "启动时可覆盖"配置——打包产物不再内联最终值。
 *
 * 安全边界：白名单仅含 NUXT_PUBLIC_*（设计上可暴露给前端的公开变量），
 * secret（DATABASE_URL、CSC_KEY_PASSWORD 等）一律不经过此通道。
 */
import type { LaunchEnv, LaunchEnvKey } from '@growth-os/types'

const ALLOWLIST: readonly LaunchEnvKey[] = [
  'NUXT_PUBLIC_SUPABASE_URL',
  'NUXT_PUBLIC_SUPABASE_ANON_KEY',
  'NUXT_PUBLIC_API_BASE_URL',
  'NUXT_PUBLIC_APP_NAME',
  'NUXT_PUBLIC_SITE_URL',
]

export function launchEnvHandler(): LaunchEnv {
  const out: LaunchEnv = {}
  for (const key of ALLOWLIST) {
    const value = process.env[key]
    if (value) out[key] = value
  }
  return out
}
