import { describe, it, expect } from 'vitest'
import { cn, ThemeToggle } from '../src/index.ts'

describe('barrel 导出', () => {
  it('导出 cn 工具函数', () => {
    expect(typeof cn).toBe('function')
  })

  it('导出 ThemeToggle 组件', () => {
    expect(ThemeToggle).toBeDefined()
  })
})
