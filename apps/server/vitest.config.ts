import { defineConfig } from 'vitest/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * server 单测配置：test/ 目录与 src/ 平级且路径镜像（test/x/y.test.ts 对应 src/x/y.ts），
 * 全 mock、不触外部服务；e2e 走 vitest.e2e.config.ts。
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    coverage: {
      include: ['src/**'],
      exclude: ['**/*.test.ts'],
    },
  },
})
