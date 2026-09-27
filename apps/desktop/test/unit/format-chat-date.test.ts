import { describe, expect, it } from 'vitest'
import { formatChatDate } from '../../app/utils/chat'

/**
 * 消息流日期分割线格式化（formatChatDate）单元测试（node 环境，相对路径导入）：
 * M-DD 两位数字格式、时区按本地时区解释
 */
describe('formatChatDate', () => {
  it('输出月-日两位数字格式', () => {
    // 本地时区 2025-09-26 12:00（时间取当天中午，避免时区跨日）
    expect(formatChatDate(new Date(2025, 8, 26, 12).getTime())).toBe('09-26')
    expect(formatChatDate(new Date(2026, 0, 3, 12).getTime())).toBe('01-03')
    expect(formatChatDate(new Date(2026, 11, 31, 12).getTime())).toBe('12-31')
  })
})
