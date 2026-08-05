import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useToast } from '~/composables/useToast'

/**
 * 全局 toast 测试
 * 覆盖：添加、默认类型、duration=0 常驻、定时自动移除、手动移除、id 唯一
 */
const { toasts, showToast, removeToast } = useToast()

describe('useToast', () => {
  beforeEach(() => {
    toasts.value = []
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('showToast 添加条目，默认 type 为 info', () => {
    showToast('hello')
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ message: 'hello', type: 'info' })
  })

  it('支持指定 type 与递增 id', () => {
    showToast('a', 'success')
    showToast('b', 'error')
    expect(toasts.value[0]!.id).not.toBe(toasts.value[1]!.id)
    expect(toasts.value.map((t) => t.type)).toEqual(['success', 'error'])
  })

  it('duration=0 常驻，不自动移除', () => {
    showToast('pin', 'info', 0)
    vi.advanceTimersByTime(10_000)
    expect(toasts.value).toHaveLength(1)
  })

  it('默认 3s 后自动移除', () => {
    showToast('temp')
    vi.advanceTimersByTime(2999)
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.value).toHaveLength(0)
  })

  it('removeToast 手动移除指定条目', () => {
    showToast('a')
    showToast('b')
    removeToast(toasts.value[0]!.id)
    expect(toasts.value.map((t) => t.message)).toEqual(['b'])
  })
})
