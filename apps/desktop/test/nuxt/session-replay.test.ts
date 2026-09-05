import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { ChatMessage, Message } from '@growth-os/types'
import ChatMessageItem from '~/components/chat/chat-message-item.vue'
import { useSessionReplay } from '~/composables/useSessionReplay'
import { sessionRecordingFixture } from '../fixtures/session-recording'

/**
 * 会话录制-回放测试（迭代计划 1.2 P0）。
 *
 * 复用现有 apiFetch mock 路径（mockNuxtImport useSupabase + stub 全局 fetch，
 * 同 use-api.test.ts），把录制 fixture 注入真实请求链路，断言：
 * 1. 消息投影——deriveMessages 重建模型可见历史（模型可见即已记录）；
 * 2. UI 关键状态——聊天组件渲染的气泡数、角色定位与内容顺序。
 * CI 无 API key 可跑：不触任何外部服务。
 */
const mocks = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
  },
}))

mockNuxtImport('useSupabase', () => () => ({ auth: mocks.auth }))

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

/** 聊天 UI 只渲染用户/助手且内容非空的消息（工具调用载体消息 content 为空，属步骤而非气泡） */
function renderableMessages(messages: Message[]): ChatMessage[] {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content !== '')
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
}

/** 回放挂载外壳：加载会话事件并按聊天 UI 规则渲染气泡 */
const ReplayHarness = defineComponent({
  setup() {
    const { messages, load } = useSessionReplay('sess_replay_001')
    void load()
    return () =>
      h(
        'div',
        renderableMessages(messages.value).map((m) => h(ChatMessageItem, { message: m })),
      )
  },
})

describe('会话录制-回放（apiFetch 注入 fixture）', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-replay' } },
    })
    // 线上响应经响应信封包裹为 { data }，apiFetch 负责解包
    fetchMock.mockResolvedValue(jsonResponse(200, { data: sessionRecordingFixture }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mocks.auth.getSession.mockReset()
  })

  it('消息投影：录制事件重建模型可见历史（7 条，簿记事件跳过，工具调用链完整）', async () => {
    const { messages, load } = useSessionReplay('sess_replay_001')

    await load()

    expect(messages.value).toEqual([
      { role: 'system', content: '你是 Growth OS 助手，回答保持简洁。' },
      { role: 'system', content: '当前时间：2025-01-01 08:00 (Asia/Shanghai)' },
      { role: 'user', content: '帮我查一下今天的日期' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call_001', name: 'get_current_time', arguments: '{"timezone":"Asia/Shanghai"}' },
        ],
      },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call_001', name: 'get_current_time', arguments: '{"timezone":"Asia/Shanghai"}' },
        ],
      },
      { role: 'tool', content: '2025-01-01', toolCallId: 'call_001' },
      { role: 'assistant', content: '今天是 2025-01-01。' },
    ])
  })

  it('UI 关键状态：渲染用户提问与 AI 最终回答两个气泡，角色定位与顺序正确', async () => {
    const wrapper = mount(ReplayHarness)
    await flushPromises()

    const chats = wrapper.findAll('.chat')
    expect(chats).toHaveLength(2)

    // 用户消息：chat-end（右侧）
    expect(chats[0]!.classes()).toContain('chat-end')
    expect(chats[0]!.find('.chat-bubble').text()).toBe('帮我查一下今天的日期')

    // AI 最终回答：chat-start（左侧 + 头像）
    expect(chats[1]!.classes()).toContain('chat-start')
    expect(chats[1]!.find('.chat-image.avatar').exists()).toBe(true)
    expect(chats[1]!.find('.chat-bubble').text()).toBe('今天是 2025-01-01。')
  })

  it('空录制：投影为空历史，UI 不渲染气泡', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [] }))
    const wrapper = mount(ReplayHarness)
    await flushPromises()

    expect(wrapper.findAll('.chat')).toHaveLength(0)
  })
})
