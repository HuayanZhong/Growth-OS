import { describe, expect, it } from 'vitest'
import { analyzeIntent } from '../../../src/modules/chat/intent.ts'
import type { CreateChatStreamInput } from '@growth-os/types'

/**
 * 意图占位：恒直通 chat（H3 换实现时本测试改为分类断言）。
 */
describe('analyzeIntent', () => {
  it('任意输入恒返回 chat 直通', () => {
    const input: CreateChatStreamInput = {
      agentSlug: 'xiaohuayan',
      messages: [{ role: 'user', content: '你好' }],
    }
    expect(analyzeIntent(input)).toEqual({ type: 'chat' })
  })
})
