import { defineConfig } from 'vitest/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * types 单测配置：test/ 目录与 src/ 平级且路径镜像（test/x/y.test.ts 对应 src/x/y.ts）。
 * 本包多为纯类型（无运行时行为），仅 zod schema 有可测运行时逻辑。
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
