import { coverageConfigDefaults, defineConfig } from 'vitest/config'
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
      // 口径：覆盖率只度量可执行源——资产/类型声明/纯 re-export barrel 不计入分母
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/*.d.ts',
        '**/*.{css,svg,woff,woff2,png,jpg}',
        '**/.gitkeep',
        '**/index.ts',
      ],
      // 基线 = 2026-09-09 口径修正后实测整数下限，防倒退不强制提升；调升需显式改数字
      thresholds: { lines: 97, branches: 94 },
    },
  },
})
