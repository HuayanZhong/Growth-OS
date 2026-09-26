import { describe, expect, it } from 'vitest'
import { AGENT_LIST, getAgent, getDefaultAgent } from '../../app/utils/agents'

/**
 * Agent 目录测试：slug 查找、默认 Agent 获取、目录不变量
 */
describe('Agent 目录', () => {
  it('getAgent 按 slug 命中', () => {
    const agent = getAgent('xiaohuayan')
    expect(agent?.name).toBe('小花颜')
    expect(agent?.isDefault).toBe(true)
  })

  it('getAgent 未知 slug 返回 undefined', () => {
    expect(getAgent('ghost')).toBeUndefined()
  })

  it('getDefaultAgent 返回默认 Agent', () => {
    const agent = getDefaultAgent()
    expect(agent.slug).toBe('xiaohuayan')
    expect(agent.isDefault).toBe(true)
  })

  it('目录不变量：默认 Agent 恰好一个且 slug 唯一', () => {
    const defaults = AGENT_LIST.filter((agent) => agent.isDefault)
    expect(defaults).toHaveLength(1)
    const slugs = AGENT_LIST.map((agent) => agent.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
