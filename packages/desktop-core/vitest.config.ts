import { defineConfig } from 'vitest/config'
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
    },
  },
})
