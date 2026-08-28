import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * e2e 配置：等价原 test/jest-e2e.json + --runInBand。
 * SWC 插件：Vitest 转换器不产出 emitDecoratorMetadata，Nest DI（createTestingModule）
 * 依赖该元数据解析构造参数，必须由 SWC 补齐（仅 e2e 走 DI 容器，单测不需要）。
 * testTimeout 放宽到 30s：beforeAll 完整启动 Nest 应用，auth-me 真实登录用例走 Supabase 网络。
 * env 由脚本里的 dotenv-cli 注入 process.env（spec 直接读 process.env，与 jest 时期一致）。
 */
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    ...baseTestConfig,
    include: ['test/*.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
