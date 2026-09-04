import { defineConfig } from 'vitest/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * shared 单测配置：test/ 目录与 src/ 平级且路径镜像（test/x/y.test.ts 对应 src/x/y.ts）。
 * 纯函数无 mock。
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    include: ['test/**/*.test.ts'],
    coverage: {
      include: ['src/**'],
    },
  },
})
