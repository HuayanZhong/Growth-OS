import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * Nuxt 测试环境不会自动加载 .env（.env 在 monorepo 根目录，且 vitest 无 --dotenv 选项），
 * 而 nuxt.config.ts 的 runtimeConfig 默认值在加载时读取 process.env.NUXT_PUBLIC_*。
 * 因此在 vitest 进程启动时手动把根 .env 注入 process.env（不覆盖已存在的变量）。
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

/**
 * desktop 应用测试配置
 * 使用 Nuxt 测试环境，支持 auto-import 和 composables
 */
export default defineVitestConfig({
  test: {
    ...baseTestConfig,
    environment: 'nuxt',
  },
})
