import { beforeEach, describe, expect, it, vi } from 'vitest'
import { unref } from 'vue'
import { apiFetch, ApiError } from '~/composables/useApi'
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
 * 目录以服务端为唯一数据源——loadAgents 成功/失败/错误状态、创建追加、删除移除并清会话、
 * 默认 Agent 可空语义、loaded/loadError 门控。apiFetch 以 vi.mock 注入（不触真实网络），
 * ApiError 保留真实实现（loadError 的 instanceof 分流依赖它）。
 */

vi.mock('~/composables/useApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/composables/useApi')>()
  return { ...actual, apiFetch: vi.fn() }
})

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
    it('成功：目录为服务端返回值（默认在前），loaded 置位，默认 Agent 可得，错误清除', async () => {
      const custom = makeAgent()
      mockFetch.mockResolvedValue([DEFAULT_AGENT, custom])

      await loadAgents()

      expect(mockFetch).toHaveBeenCalledWith('/agents')
      expect(getDefaultAgent()).toEqual(DEFAULT_AGENT)
      expect(getAgent(custom.slug)).toEqual(custom)
      expect(unref(useAgents().loaded)).toBe(true)
      expect(unref(useAgents().loadError)).toBeNull()
    })

    it('失败（非会话失效）：记入 loadError 可重试错误态，loaded 仍置位', async () => {
      mockFetch.mockRejectedValue(new Error('网络失败'))

      await expect(loadAgents()).resolves.toBeUndefined()

      expect(getDefaultAgent()).toBeUndefined()
      expect(getAgent('agent-abc12345')).toBeUndefined()
      expect(unref(useAgents().loaded)).toBe(true)
      const err = unref(useAgents().loadError)
      expect(err).toBeInstanceOf(ApiError)
      expect(err?.code).toBe('NETWORK_ERROR')
      expect(err?.status).toBe(0)
    })

    it('失败（服务端 500 ApiError）：loadError 保留原始状态码与错误码', async () => {
      mockFetch.mockRejectedValue(new ApiError(500, { code: 'INTERNAL', message: '服务器故障' }))

      await loadAgents()

      const err = unref(useAgents().loadError)
      expect(err).toBeInstanceOf(ApiError)
      expect(err?.status).toBe(500)
      expect(err?.code).toBe('INTERNAL')
    })

    it('失败（401 会话失效）：已由 apiFetch 出口接管，loadError 置空（页面不呈现错误态）', async () => {
      mockFetch.mockRejectedValue(
        new ApiError(401, { code: 'SESSION_EXPIRED', message: '登录已失效，请重新登录' }),
      )

      await loadAgents()

      expect(unref(useAgents().loadError)).toBeNull()
      expect(unref(useAgents().loaded)).toBe(true)
    })

    it('重试成功：错误清除，目录恢复', async () => {
      mockFetch.mockRejectedValue(new Error('网络失败'))
      await loadAgents()
      expect(unref(useAgents().loadError)).not.toBeNull()

      mockFetch.mockResolvedValue([DEFAULT_AGENT])
      await loadAgents()

      expect(unref(useAgents().loadError)).toBeNull()
      expect(getDefaultAgent()).toEqual(DEFAULT_AGENT)
    })

    it('未加载时 loaded 为 false（区别于加载完成但为空）', () => {
      expect(unref(useAgents().loaded)).toBe(false)
      expect(unref(useAgents().loadError)).toBeNull()
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
    mockFetch.mockRejectedValue(new Error('网络失败'))
    await loadAgents()
    expect(getDefaultAgent()).toBeUndefined()
    expect(unref(useAgents().loadError)).not.toBeNull()

    resetAgents()

    expect(getDefaultAgent()).toBeUndefined()
    expect(unref(useAgents().loaded)).toBe(false)
    expect(unref(useAgents().loadError)).toBeNull()
  })

  it('表情候选清单：含默认形象、id 唯一且均为字符串编号', () => {
    const ids = AGENT_AVATAR_OPTIONS.map((option) => option.id)
    expect(ids).toContain('02')
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^\d{2}$/.test(id))).toBe(true)
  })
})
