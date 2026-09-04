import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * ui 包测试配置：test/ 目录与 src/ 平级且路径镜像（test/x/y.test.ts 对应 src/x/y.ts）。
 * 组件测试跑在 happy-dom；SFC 编译用 @vitejs/plugin-vue。
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    ...baseTestConfig,
    environment: 'happy-dom',
    coverage: {
      include: ['src/**'],
    },
  },
})
