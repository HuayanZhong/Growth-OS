import { beforeEach, describe, expect, it } from 'vitest'
import { createAgent, getAgent, getDefaultAgent, initAgents } from '../../app/composables/useAgents'
import { AGENT_AVATAR_OPTIONS } from '../../app/utils/agents'
import type { AgentEntry } from '../../app/types/agents'

/**
 * Agent 目录（useAgents）单元测试（node 环境，无 `~` 别名用相对路径）：
 * 内置 seed 保护、创建追加与 slug 唯一、持久化只写自定义、损坏回退、查找语义
 */

// node 环境无 localStorage：注入 fake Storage（Map 实现，仅用到 getItem/setItem）
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
    key: () => null,
    get length() {
      return map.size
    },
  }
}

function storedEntries(storage: Storage): AgentEntry[] {
  const raw = storage.getItem('growth-os-agents')
  expect(raw).not.toBeNull()
  return JSON.parse(raw ?? '[]') as AgentEntry[]
}

describe('Agent 目录（useAgents）', () => {
  beforeEach(() => {
    // 隔离：每例重置为仅内置目录（initAgents(null) 即清空本地自定义项）
    initAgents(null)
  })

  it('初始目录仅含内置默认 Agent（小花颜，isDefault，默认表情）', () => {
    const agent = getDefaultAgent()
    expect(agent.slug).toBe('xiaohuayan')
    expect(agent.name).toBe('小花颜')
    expect(agent.isDefault).toBe(true)
    expect(agent.emotion).toBe('02')
    expect(getAgent('ghost')).toBeUndefined()
  })

  it('createAgent 追加自定义 Agent：slug 前缀、isDefault false、字段完整', () => {
    const agent = createAgent(
      { name: '写作助手', emotion: '10', description: '帮我写文章' },
      fakeStorage(),
    )
    expect(agent.slug).toMatch(/^agent-/)
    expect(agent.isDefault).toBe(false)
    expect(agent.name).toBe('写作助手')
    expect(agent.emotion).toBe('10')
    expect(agent.description).toBe('帮我写文章')
    expect(getAgent(agent.slug)).toBeDefined()
    expect(getDefaultAgent().slug).toBe('xiaohuayan')
  })

  it('同名多次创建 slug 唯一；目录不变量保持（默认恰一个、slug 不重复）', () => {
    const first = createAgent({ name: '同名', emotion: '10' }, fakeStorage())
    const second = createAgent({ name: '同名', emotion: '13' }, fakeStorage())
    expect(first.slug).not.toBe(second.slug)
    const all = [getDefaultAgent(), first, second]
    const slugs = all.map((agent) => agent.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(all.filter((agent) => agent.isDefault)).toHaveLength(1)
  })

  it('持久化只写自定义 Agent，不含内置 seed', () => {
    const storage = fakeStorage()
    createAgent({ name: '写作助手', emotion: '10' }, storage)
    const entries = storedEntries(storage)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.name).toBe('写作助手')
    expect(entries[0]?.isDefault).toBe(false)
  })

  it('color/skills 随创建透传；未设字段不落盘', () => {
    const storage = fakeStorage()
    createAgent(
      { name: '全配置', emotion: '14', color: '#CFE2F4', skills: ['web-search', 'knowledge'] },
      storage,
    )
    const entry = storedEntries(storage)[0]
    expect(entry?.color).toBe('#CFE2F4')
    expect(entry?.skills).toEqual(['web-search', 'knowledge'])

    const storage2 = fakeStorage()
    createAgent({ name: '最小配置', emotion: '10' }, storage2)
    // persist 写全量自定义列表（单例已含前一步条目），按名称定位目标
    const minimal = storedEntries(storage2).find((item) => item.name === '最小配置')
    expect('color' in (minimal ?? {})).toBe(false)
    expect('skills' in (minimal ?? {})).toBe(false)
  })

  it('重启恢复：合法存储内容合并回目录', () => {
    const storage = fakeStorage({
      'growth-os-agents': JSON.stringify([
        { slug: 'agent-abc12345', name: '恢复者', isDefault: false, emotion: '14' },
      ]),
    })
    initAgents(storage)
    const restored = getAgent('agent-abc12345')
    expect(restored?.name).toBe('恢复者')
    expect(restored?.emotion).toBe('14')
    expect(getDefaultAgent().slug).toBe('xiaohuayan')
  })

  it('损坏 JSON 静默回退仅内置目录，不抛错', () => {
    expect(() => initAgents(fakeStorage({ 'growth-os-agents': '{oops' }))).not.toThrow()
    expect(getAgent('agent-abc12345')).toBeUndefined()
    expect(getDefaultAgent().slug).toBe('xiaohuayan')
  })

  it('结构不符或越权条目被拒：非对象、isDefault true、slug 与内置冲突', () => {
    initAgents(
      fakeStorage({
        'growth-os-agents': JSON.stringify([
          42,
          { slug: 'agent-fake', name: '伪装默认', isDefault: true, emotion: '10' },
          { slug: 'xiaohuayan', name: '冒充内置', isDefault: false, emotion: '10' },
          { slug: 'agent-good', name: '合法条目', isDefault: false, emotion: '16' },
        ]),
      }),
    )
    expect(getAgent('agent-fake')).toBeUndefined()
    expect(getAgent('xiaohuayan')?.name).toBe('小花颜')
    expect(getAgent('agent-good')?.name).toBe('合法条目')
    expect(getDefaultAgent().slug).toBe('xiaohuayan')
  })

  it('表情候选清单：含默认形象、id 唯一且均为字符串编号', () => {
    const ids = AGENT_AVATAR_OPTIONS.map((option) => option.id)
    expect(ids).toContain('02')
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^\d{2}$/.test(id))).toBe(true)
  })
})
