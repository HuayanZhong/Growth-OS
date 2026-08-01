import { defineVitestConfig } from '@nuxt/test-utils/config'
import { baseTestConfig } from '../../tooling/test/base.ts'

/**
 * desktop 应用测试配置
 * 使用 Nuxt 测试环境，支持 auto-import 和 composables
 */
export default defineVitestConfig({
  test: {
    ...baseTestConfig,
    environment: 'nuxt',
  },
})
