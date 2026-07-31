import { defineWorkspace } from 'vitest/config';

/**
 * Vitest Workspace 根入口
 * 各项目的测试配置由对应的 vitest.config.ts 定义
 */
export default defineWorkspace([
  'apps/desktop/vitest.config.ts',
]);
