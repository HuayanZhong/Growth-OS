import { defineConfig } from 'vitest/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * server 单测配置：spec 与源码同目录（src 下的 .spec.ts 文件），全 mock、不触外部服务。
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    include: ['src/**/*.spec.ts'],
  },
})
