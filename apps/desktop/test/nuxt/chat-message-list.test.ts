import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatMessageList from '~/components/ChatMessageList.vue'
import type { ChatMessage } from '~/types/chat'

// 组件内 getAgent 走服务端目录单例（server-agent-directory）：以 mock apiFetch 灌入目录
vi.mock('~/composables/useApi', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '~/composables/useApi'
import { loadAgents } from '~/composables/useAgents'

const mockFetch = vi.mocked(apiFetch)

beforeEach(async () => {
  mockFetch.mockResolvedValue([
    { id: 'seed-uuid', slug: 'xiaohuayan', name: '小花颜', isDefault: true, emotion: '02' },
  ])
  await loadAgents()
})

/**
 * 会话消息流渲染测试（EmotionBall 打桩，聚焦身份行与 role/kind 渲染区分）：
 * 每条消息带身份行（头像 + 名字，agent 加 AI 徽章），agent 气泡灰底、
 * typing 占位渲染 loading-dots、顶部「对话由AI生成」声明与日期分割线
 */
const messages: ChatMessage[] = [
  { id: 'm1', role: 'user', kind: 'text', text: '帮我写个周报', createdAt: 1758888000000 },
  { id: 'm2', role: 'agent', kind: 'typing', text: '', createdAt: 1758888000000 },
]

function mountList(extra: ChatMessage[] = []) {
  return mount(ChatMessageList, {
    props: {
      messages: [...messages, ...extra],
      agentSlug: 'xiaohuayan',
      userName: 'user@example.com',
    },
    global: {
      stubs: {
        EmotionBall: {
          props: ['emotion', 'color'],
          template: '<span data-test="emotion-ball" :data-emotion="emotion" :data-color="color" />',
        },
      },
    },
  })
}

describe('ChatMessageList', () => {
  it('渲染用户消息气泡与 agent typing 占位（loading-dots）', () => {
    const wrapper = mountList()
    expect(wrapper.text()).toContain('帮我写个周报')
    const typing = wrapper.find('[data-test="typing-indicator"]')
    expect(typing.exists()).toBe(true)
    expect(typing.find('.loading-dots').exists()).toBe(true)
  })

  it('身份行：agent 名 + AI 徽章，用户名 + 首字符头像', () => {
    const wrapper = mountList()
    // agent 身份行（typing 行）：名字 + AI 徽章
    expect(wrapper.text()).toContain('小花颜')
    expect(wrapper.findAll('[data-test="ai-badge"]')).toHaveLength(1)
    // 用户身份行：邮箱 + 首字符头像
    expect(wrapper.text()).toContain('user@example.com')
    expect(wrapper.find('[data-test="user-avatar"]').text()).toBe('U')
  })

  it('agent 正式消息带头像与 AI 徽章，消息体在灰底气泡内', () => {
    const wrapper = mountList([
      { id: 'm3', role: 'agent', kind: 'text', text: '好的，收到', createdAt: 1758888000000 },
    ])
    expect(wrapper.text()).toContain('好的，收到')
    // agent 头像：typing 行 + agent 文本行各一个
    expect(wrapper.findAll('[data-test="emotion-ball"]')).toHaveLength(2)
    // 两条 agent 消息各一个 AI 徽章
    expect(wrapper.findAll('[data-test="ai-badge"]')).toHaveLength(2)
  })

  it('顶部渲染「对话由AI生成」声明与日期分割线（首条消息时间，M-DD）', () => {
    const wrapper = mountList()
    expect(wrapper.text()).toContain('对话由AI生成')
    const divider = wrapper.find('[data-test="date-divider"]')
    expect(divider.text()).toMatch(/^\d{2}-\d{2}$/)
  })

  it('无消息时不渲染顶部元信息', () => {
    const wrapper = mount(ChatMessageList, {
      props: { messages: [], agentSlug: 'xiaohuayan' },
      global: { stubs: { EmotionBall: true } },
    })
    expect(wrapper.find('[data-test="date-divider"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('对话由AI生成')
  })

  it('带图消息：图上文下混排渲染，仅图消息无文本区', () => {
    const wrapper = mountList([
      {
        id: 'm4',
        role: 'user',
        kind: 'text',
        text: '看这张图',
        images: ['data:image/png;base64,aGk=', 'data:image/jpeg;base64,aGk='],
        createdAt: 1758888000000,
      },
      {
        id: 'm5',
        role: 'user',
        kind: 'text',
        text: '',
        images: ['data:image/png;base64,aGk='],
        createdAt: 1758888000000,
      },
    ])
    const images = wrapper.findAll('[data-test="message-image"]')
    expect(images).toHaveLength(3)
    expect(images[0]?.attributes('src')).toBe('data:image/png;base64,aGk=')
    // 图文混排：文本仍在
    expect(wrapper.text()).toContain('看这张图')
  })

  it('无图消息不渲染图片节点', () => {
    const wrapper = mountList()
    expect(wrapper.findAll('[data-test="message-image"]')).toHaveLength(0)
  })

  it('模型切换分割线：居中渲染文案，无身份行', () => {
    const wrapper = mountList([
      {
        id: 'm6',
        role: 'agent',
        kind: 'divider',
        text: '已切换至 DeepSeek',
        createdAt: 1758888000000,
      },
    ])
    const divider = wrapper.find('[data-test="model-divider"]')
    expect(divider.exists()).toBe(true)
    expect(divider.text()).toContain('已切换至 DeepSeek')
    // 分割线为会话元信息：不带身份行（无头像/AI 徽章）
    expect(divider.find('[data-test="ai-badge"]').exists()).toBe(false)
  })
})
