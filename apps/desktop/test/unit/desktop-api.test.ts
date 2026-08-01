import { describe, it, expect } from 'vitest'

/**
 * 测试环境验证
 * 确认 Vitest + Nuxt 环境已正确配置
 */
describe('测试环境验证', () => {
  it('Vitest 已正确配置', () => {
    expect(1 + 1).toBe(2)
  })
})
