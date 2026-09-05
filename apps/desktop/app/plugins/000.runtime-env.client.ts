import { parseEnv, publicEnvSchema } from '@growth-os/shared'

/**
 * 启动环境注入插件（迭代计划 2.4"启动时可覆盖"）。
 *
 * Electron 壳内：经 launchEnv IPC 通道取主进程启动时的 NUXT_PUBLIC_* 白名单，
 * 在应用装配前合并进 runtimeConfig.public——打包产物内联的只是默认值，
 * 部署/运行环境可通过环境变量覆盖（如换后端地址无需重新构建）。
 *
 * 合并后用 shared 的 publicEnvSchema 做 fail-fast 校验（规则与 server 共用一份），
 * 配置缺失/格式非法在启动瞬间报错，而不是等到 createClient/请求时才炸。
 *
 * web 预览（无 Electron 壳）：没有 launchEnv 通道，构建期默认值即最终值，
 * 插件直接返回。000 数字前缀保证它先于其他插件执行。
 */
const CONFIG_KEY_BY_ENV: Record<string, string> = {
  NUXT_PUBLIC_SUPABASE_URL: 'supabaseUrl',
  NUXT_PUBLIC_SUPABASE_ANON_KEY: 'supabaseAnonKey',
  NUXT_PUBLIC_API_BASE_URL: 'apiBaseUrl',
  NUXT_PUBLIC_APP_NAME: 'appName',
  NUXT_PUBLIC_SITE_URL: 'siteUrl',
}

export default defineNuxtPlugin({
  name: 'runtime-env',
  async setup() {
    // runtimeConfig.public 的键在 nuxt.config 中静态声明，合并写入需放宽索引类型
    const config = useRuntimeConfig().public as unknown as Record<string, string | undefined>

    // web 预览（无 Electron 壳）：无 launchEnv 通道，直接使用构建期默认值
    if (!window.desktop) return

    const overrides = await window.desktop.launchEnv()
    for (const [envKey, value] of Object.entries(overrides)) {
      const configKey = CONFIG_KEY_BY_ENV[envKey]
      if (configKey && value) config[configKey] = value
    }

    parseEnv(
      publicEnvSchema,
      {
        NUXT_PUBLIC_SUPABASE_URL: config.supabaseUrl,
        NUXT_PUBLIC_SUPABASE_ANON_KEY: config.supabaseAnonKey,
        NUXT_PUBLIC_API_BASE_URL: config.apiBaseUrl,
      },
      { label: 'desktop runtime' },
    )
  },
})
