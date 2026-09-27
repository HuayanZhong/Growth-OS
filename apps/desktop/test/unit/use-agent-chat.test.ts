import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumePending,
  getSession,
  hasSession,
  resetAgentChat,
  sendMessage,
  stagePending,
} from '../../app/composables/useAgentChat'

/**
 * Agent 会话状态（useAgentChat）单元测试（node 环境，相对路径导入）：
 * 发送追加（用户消息 + typing 占位、连续发送去重旧占位）、slug 隔离、
 * 会话存在性判定、pending 命中消费与未命中丢弃、空文本守卫
 */
describe('Agent 会话状态（useAgentChat）', () => {
  beforeEach(() => {
    // 隔离：每例清空模块级单例（会话 + pending）
    resetAgentChat()
  })

  it('sendMessage 追加用户消息与 agent typing 占位', () => {
    sendMessage('xiaohuayan', '  帮我写个周报  ')
    const { messages } = getSession('xiaohuayan')!
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ role: 'user', kind: 'text', text: '帮我写个周报' })
    expect(messages[1]).toMatchObject({ role: 'agent', kind: 'typing', text: '' })
    // 每条消息带创建时间戳（日期分割线数据来源）
    expect(typeof messages[0]?.createdAt).toBe('number')
  })

  it('连续发送只保留末尾一条 typing 占位，消息按序追加', () => {
    sendMessage('xiaohuayan', '第一条')
    sendMessage('xiaohuayan', '第二条')
    const { messages } = getSession('xiaohuayan')!
    expect(messages.map((message) => [message.role, message.kind])).toEqual([
      ['user', 'text'],
      ['user', 'text'],
      ['agent', 'typing'],
    ])
    expect(messages[1]?.text).toBe('第二条')
  })

  it('会话按 slug 隔离', () => {
    sendMessage('xiaohuayan', '给小花颜')
    sendMessage('biancheng', '给编程专家')
    expect(getSession('xiaohuayan')?.messages.some((m) => m.text === '给小花颜')).toBe(true)
    expect(getSession('xiaohuayan')?.messages.some((m) => m.text === '给编程专家')).toBe(false)
    expect(hasSession('xiaohuayan')).toBe(true)
    expect(hasSession('ghost')).toBe(false)
  })

  it('hasSession 以消息流非空为准：无会话与空会话都视为不存在', () => {
    expect(hasSession('xiaohuayan')).toBe(false)
    expect(getSession('xiaohuayan')).toBeUndefined()
    sendMessage('xiaohuayan', 'hello')
    expect(hasSession('xiaohuayan')).toBe(true)
  })

  it('空文本/纯空白发送不产生任何消息', () => {
    sendMessage('xiaohuayan', '   ')
    expect(getSession('xiaohuayan')).toBeUndefined()
  })

  it('pending 命中当前 slug 时消费并清空', () => {
    stagePending('xiaohuayan', '首发内容')
    expect(consumePending('xiaohuayan')).toBe('首发内容')
    // 消费即清空：二次消费为空
    expect(consumePending('xiaohuayan')).toBeNull()
  })

  it('pending 未命中（改道其他 agent）丢弃并返回 null', () => {
    stagePending('xiaohuayan', '本想给小花颜')
    expect(consumePending('biancheng')).toBeNull()
    // 已丢弃：回到目标 agent 也不会再拿到
    expect(consumePending('xiaohuayan')).toBeNull()
  })

  it('stagePending 覆盖旧暂存（同一时刻至多一条）', () => {
    stagePending('xiaohuayan', '旧')
    stagePending('biancheng', '新')
    expect(consumePending('biancheng')).toBe('新')
    // 已被「新」覆盖并被消费：旧目标拿不到任何内容
    expect(consumePending('xiaohuayan')).toBeNull()
  })

  it('resetAgentChat 清空会话与 pending', () => {
    sendMessage('xiaohuayan', 'hello')
    stagePending('xiaohuayan', 'draft')
    resetAgentChat()
    expect(hasSession('xiaohuayan')).toBe(false)
    expect(consumePending('xiaohuayan')).toBeNull()
  })
})
