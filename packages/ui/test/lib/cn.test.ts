import { describe, it, expect } from 'vitest'
import { cn } from '../../src/lib/cn.ts'

describe('cn', () => {
  it('拼接多个类名', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('处理条件类名（falsy 值被丢弃）', () => {
    // 用运行时变量表达条件：字面量 false 会被 oxlint 判为恒假表达式
    const isActive = false as boolean
    expect(cn('a', isActive && 'b', undefined, 'c')).toBe('a c')
  })

  it('处理对象与数组语法', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c')
  })

  it('Tailwind 冲突类后者覆盖前者', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('保留 daisyUI 组件类（不被 twMerge 吞掉）', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary')
    expect(cn('swap', 'swap-rotate')).toBe('swap swap-rotate')
  })

  it('外部覆盖类与组件类共存', () => {
    expect(cn('btn btn-primary', 'w-full')).toBe('btn btn-primary w-full')
  })
})
