import { defineConfig } from 'vitest/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * e2e 配置：等价原 test/jest-e2e.json + --runInBand。
 * testTimeout 放宽到 30s：beforeAll 完整启动 Nest 应用，auth-me 真实登录用例走 Supabase 网络。
 * env 由脚本里的 dotenv-cli 注入 process.env（spec 直接读 process.env，与 jest 时期一致）。
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    include: ['test/*.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
