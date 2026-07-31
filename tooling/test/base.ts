/**
 * 共享 Vitest 基础配置
 * 各项目在自己的 vitest.config.ts 中引入并扩展
 * 不 import vitest/config 以避免 tooling 目录的依赖解析问题
 */
export const baseTestConfig = {
  globals: true,
  include: ['test/**/*.test.ts'],
  exclude: ['node_modules', 'dist', '.nuxt', '.output'],
};
