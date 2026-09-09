import { coverageConfigDefaults, defineConfig } from 'vitest/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * desktop-core 单测配置：test/ 目录与源码根平级且路径镜像
 * （test/ipc/x.test.ts 对应 ipc/x.ts，test/src/x.test.ts 对应 src/x.ts）。
 * Electron 主进程模块通过 vi.mock('electron') 隔离，node 内置模块用真实实现。
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    include: ['test/**/*.test.ts'],
    coverage: {
      include: ['src/**', 'ipc/**', 'preload/**'],
      // 口径：覆盖率只度量可执行源——类型声明/纯类型文件不计入分母。
      // 不排除 index.ts：preload/index.ts 是真实桥接代码（invokeIpc + contextBridge），保持度量；
      // src/types.ts 是 window.desktop 全局声明（纯类型），排除。
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/*.d.ts',
        '**/*.{css,svg,woff,woff2,png,jpg}',
        '**/.gitkeep',
        'src/types.ts',
      ],
      // 基线 = 2026-09-09 口径修正后实测整数下限，防倒退不强制提升；调升需显式改数字
      thresholds: { lines: 88, branches: 91 },
    },
  },
})
