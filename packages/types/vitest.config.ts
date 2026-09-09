import { coverageConfigDefaults, defineConfig } from 'vitest/config'
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
      // 口径：覆盖率只度量可执行源。逐文件核对（2026-09-09）：运行时代码仅在
      // src/api/{agents,audit,projects,sessions,skills}.ts 与 src/auth.ts（zod schema），
      // 其余目录/文件为纯类型或 barrel，排除（新增运行时文件落在本清单外会自动被度量）。
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/*.d.ts',
        '**/*.{css,svg,woff,woff2,png,jpg}',
        '**/.gitkeep',
        '**/index.ts',
        'src/adapters/**',
        'src/events/**',
        'src/utils/**',
        'src/plugin.ts',
        'src/api/error-envelope.ts',
        'src/api/files.ts',
        'src/api/health.ts',
        'src/api/http.ts',
      ],
      // 基线 = 2026-09-09 口径修正后实测整数下限，防倒退不强制提升；调升需显式改数字
      thresholds: { lines: 21, branches: 100 },
    },
  },
})
