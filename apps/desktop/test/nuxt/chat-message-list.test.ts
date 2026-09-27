import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatMessageList from '~/components/ChatMessageList.vue'
import type { ChatMessage } from '~/types/chat'

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
})
