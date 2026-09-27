import { beforeEach, describe, expect, it, vi } from 'vitest'
import { unref } from 'vue'
import { apiFetch } from '~/composables/useApi'
import {
  createAgent,
  getAgent,
  getDefaultAgent,
  loadAgents,
  removeAgent,
  resetAgents,
  useAgents,
} from '~/composables/useAgents'
import { hasSession, resetAgentChat, sendMessage } from '~/composables/useAgentChat'
import { AGENT_AVATAR_OPTIONS } from '~/utils/agents'
import type { Agent } from '@growth-os/types'

/**
 * Agent 目录（useAgents）测试（Nuxt 运行时环境：useAgents 依赖 useApi 的
 * useRuntimeConfig/useSupabase 自动导入，node 环境跑不了，故归 test/nuxt）：
 * 目录以服务端为唯一数据源——loadAgents 成功/失败回退、创建追加、删除移除并清会话、
 * 默认 Agent 可空语义、loaded 门控。apiFetch 以 vi.mock 注入（不触真实网络）。
 */

vi.mock('~/composables/useApi', () => ({ apiFetch: vi.fn() }))

const mockFetch = vi.mocked(apiFetch)

const DEFAULT_AGENT: Agent = {
  id: 'seed-uuid',
  slug: 'xiaohuayan',
  name: '小花颜',
  isDefault: true,
  emotion: '02',
}

function makeAgent(over: Partial<Agent> = {}): Agent {
  return {
    id: 'row-1',
    slug: 'agent-abc12345',
    name: '写作助手',
    isDefault: false,
    emotion: '10',
    ...over,
  }
}

describe('Agent 目录（useAgents）', () => {
  beforeEach(() => {
    // 隔离：每例重置目录（未加载态）与聊天会话
    vi.resetAllMocks()
    resetAgents()
    resetAgentChat()
  })

  describe('loadAgents', () => {
    it('成功：目录为服务端返回值（默认在前），loaded 置位，默认 Agent 可得', async () => {
      const custom = makeAgent()
      mockFetch.mockResolvedValue([DEFAULT_AGENT, custom])

      await loadAgents()

      expect(mockFetch).toHaveBeenCalledWith('/agents')
      expect(getDefaultAgent()).toEqual(DEFAULT_AGENT)
      expect(getAgent(custom.slug)).toEqual(custom)
      expect(unref(useAgents().loaded)).toBe(true)
    })

    it('失败：静默回退空目录，loaded 仍置位（空态而非未加载）', async () => {
      mockFetch.mockRejectedValue(new Error('网络失败'))

      await expect(loadAgents()).resolves.toBeUndefined()

      expect(getDefaultAgent()).toBeUndefined()
      expect(getAgent('agent-abc12345')).toBeUndefined()
      expect(unref(useAgents().loaded)).toBe(true)
    })

    it('未加载时 loaded 为 false（区别于加载完成但为空）', () => {
      expect(unref(useAgents().loaded)).toBe(false)
    })
  })

  describe('createAgent', () => {
    it('POST 成功后追加目录并返回新条目（slug 由服务端生成）', async () => {
      mockFetch.mockResolvedValue([DEFAULT_AGENT])
      await loadAgents()
      const created = makeAgent({ slug: 'agent-new00001' })
      mockFetch.mockResolvedValue(created)

      const agent = await createAgent({ name: '写作助手', emotion: '10' })

      expect(mockFetch).toHaveBeenCalledWith('/agents', {
        method: 'POST',
        body: { name: '写作助手', emotion: '10' },
      })
      expect(agent).toEqual(created)
      expect(getAgent('agent-new00001')).toEqual(created)
      expect(getDefaultAgent()?.slug).toBe('xiaohuayan')
    })

    it('POST 失败错误向上传播，目录不变', async () => {
      mockFetch.mockResolvedValue([DEFAULT_AGENT])
      await loadAgents()
      mockFetch.mockRejectedValue(new Error('VALIDATION_ERROR'))

      await expect(createAgent({ name: 'x', emotion: '02' })).rejects.toThrow('VALIDATION_ERROR')
      expect(getDefaultAgent()?.slug).toBe('xiaohuayan')
    })
  })

  describe('removeAgent', () => {
    it('DELETE 按主键 id，成功后从目录移除并丢弃其内存聊天会话', async () => {
      const custom = makeAgent({ id: 'row-del', slug: 'agent-del00001' })
      mockFetch.mockResolvedValue([DEFAULT_AGENT, custom])
      await loadAgents()
      sendMessage(custom.slug, '草稿消息')
      expect(hasSession(custom.slug)).toBe(true)
      mockFetch.mockResolvedValue({ deleted: true })

      await removeAgent(custom)

      expect(mockFetch).toHaveBeenCalledWith('/agents/row-del', { method: 'DELETE' })
      expect(getAgent('agent-del00001')).toBeUndefined()
      expect(hasSession(custom.slug)).toBe(false)
      expect(getDefaultAgent()?.slug).toBe('xiaohuayan')
    })

    it('DELETE 失败错误向上传播，目录条目保留', async () => {
      const custom = makeAgent({ id: 'row-keep', slug: 'agent-keep0001' })
      mockFetch.mockResolvedValue([DEFAULT_AGENT, custom])
      await loadAgents()
      mockFetch.mockRejectedValue(new Error('网络失败'))

      await expect(removeAgent(custom)).rejects.toThrow('网络失败')
      expect(getAgent(custom.slug)).toBeDefined()
    })
  })

  it('resetAgents：恢复未加载空目录（测试隔离）', async () => {
    mockFetch.mockResolvedValue([DEFAULT_AGENT])
    await loadAgents()
    expect(getDefaultAgent()).toBeDefined()

    resetAgents()

    expect(getDefaultAgent()).toBeUndefined()
    expect(unref(useAgents().loaded)).toBe(false)
  })

  it('表情候选清单：含默认形象、id 唯一且均为字符串编号', () => {
    const ids = AGENT_AVATAR_OPTIONS.map((option) => option.id)
    expect(ids).toContain('02')
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^\d{2}$/.test(id))).toBe(true)
  })
})
