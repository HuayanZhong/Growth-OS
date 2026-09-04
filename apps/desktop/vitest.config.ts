import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * Nuxt 测试环境不会自动加载 .env（.env 在 monorepo 根目录，且 vitest 无 --dotenv 选项），
 * 而 nuxt.config.ts 的 runtimeConfig 默认值在加载时读取 process.env.NUXT_PUBLIC_*。
 * 因此在 vitest 进程启动时手动把根 .env 注入 process.env（不覆盖已存在的变量）。
 * 根 .env 缺失时（如 CI）用占位值兜底：测试只挂载组件/断言校验，不发起真实网络请求，
 * 占位 URL 仅用于通过 supabase-js 的 createClient 校验（URL/key 非空且格式合法）。
 */
const envPath = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match || line.trimStart().startsWith('#')) continue
    const key = match[1]
    const raw = match[2]
    if (!key || !raw || key in process.env) continue
    // 去除值两端引号（dotenv 语义），不做转义展开
    process.env[key] = raw.trim().replace(/^["']|["']$/g, '')
  }
}
// CI 无 .env 时兜底：supabase-js 要求 URL/key 非空，否则 createClient 直接 throw
process.env.NUXT_PUBLIC_SUPABASE_URL ??= 'https://placeholder.supabase.co'
process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ??= 'sb_publishable__placeholder'

/**
 * desktop 应用测试配置（官方 4.x projects 设置，环境由目录 + 项目决定）：
 * - `test/unit/` → node 环境纯单元测试（不依赖 Nuxt 运行时功能，快）
 * - `test/nuxt/` → Nuxt 运行时环境（auto-import / mountSuspended / mockNuxtImport），
 *   并自动纳入 Nuxt TypeScript 上下文（别名与自动导入可识别）
 * defineVitestProject 仅用于 Nuxt 环境项目；unit/e2e 项目用常规 node 环境。
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    coverage: {
      include: ['app/**'],
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
        },
      }),
    ],
  },
})
