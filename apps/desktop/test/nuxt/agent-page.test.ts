import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mocks = vi.hoisted(() => ({
  route: null as unknown as { params: { id: string } },
}))

mockNuxtImport('useRoute', () => () => mocks.route)

import AgentPage from '~/pages/dashboard/agents/[id].vue'
import { resetAgentChat, sendMessage, stagePending } from '~/composables/useAgentChat'

/**
 * Agent 页双态测试（EmotionBall/NuxtLink 打桩，消息流走真实组件）：
 * 无会话 hero 态、未知 slug 404、pending 交接直达 chat、缓存会话直达 chat、
 * hero 发送经停靠过渡进入 chat、slug 变化重新判定入场态
 */
function setRoute(id: string) {
  mocks.route = { params: { id } }
}

function mountPage() {
  return mount(AgentPage, {
    global: {
      stubs: {
        EmotionBall: {
          props: ['emotion', 'color'],
          template: '<span data-test="emotion-ball" :data-emotion="emotion" :data-color="color" />',
        },
        NuxtLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
      },
    },
  })
}

beforeEach(() => {
  // 隔离：每例清空会话单例与 pending
  resetAgentChat()
})

describe('Agent 页双态', () => {
  it('无会话渲染 hero 态：问候语 + 居中输入区 + 目录 emotion 头像', () => {
    setRoute('xiaohuayan')
    const wrapper = mountPage()
    expect(wrapper.find('h1').exists()).toBe(true)
    expect(wrapper.text()).toContain('今天想让')
    expect(wrapper.text()).toContain('小花颜')
    expect(wrapper.text()).toContain('搞定哪件事？')
    expect(wrapper.find('textarea').attributes('placeholder')).toBe(
      '告诉小花颜，你想先从哪件事开始…',
    )
    // seed Agent 无自定义颜色：color prop 透传为 undefined（属性缺省）
    const ball = wrapper.find('[data-test="emotion-ball"]')
    expect(ball.attributes('data-emotion')).toBe('02')
    expect(ball.attributes('data-color')).toBeUndefined()
    // hero 根容器居中布局，无消息流
    expect(wrapper.find('h1').classes().length).toBeGreaterThan(0)
    expect(wrapper.find('[data-test="typing-indicator"]').exists()).toBe(false)
  })

  it('未知 slug 抛 404', () => {
    setRoute('ghost')
    expect(() => mountPage()).toThrow()
  })

  it('pending 交接命中：直接 chat 态且首条消息已入列（无问候语）', () => {
    setRoute('xiaohuayan')
    stagePending('xiaohuayan', '帮我把项目周报整理成文档')
    const wrapper = mountPage()
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).toContain('帮我把项目周报整理成文档')
    expect(wrapper.find('[data-test="typing-indicator"]').exists()).toBe(true)
    // chat 态不渲染 Agent 选择垫层（切 agent 走侧边栏）
    expect(wrapper.find('a[href="/dashboard/agents/xiaohuayan"]').exists()).toBe(false)
    // chat 顶栏：Agent 名 + 在线状态
    const header = wrapper.find('[data-test="chat-header"]')
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('小花颜')
    expect(header.text()).toContain('在线')
    // Agent 信息卡（点击名字弹出）：含名称/身份/技能计数，无发消息/新项目按钮
    const card = wrapper.find('[data-test="agent-card"]')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('已开启技能 · 0')
    expect(card.text()).not.toContain('发消息')
    expect(card.text()).not.toContain('新项目')
  })

  it('有缓存会话：直达 chat 态且消息保留', () => {
    setRoute('xiaohuayan')
    sendMessage('xiaohuayan', '早前消息')
    const wrapper = mountPage()
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).toContain('早前消息')
  })

  it('hero 态发送：经停靠过渡进入 chat 态，消息入列且草稿清空', async () => {
    setRoute('xiaohuayan')
    const wrapper = mountPage()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('你好呀')
    await wrapper.find('button[title="发送"]').trigger('click')
    // 过渡为真实 GSAP 时序（问候语淡出 → 翻转布局），waitFor 等待完成
    await vi.waitFor(
      () => {
        expect(wrapper.find('h1').exists()).toBe(false)
      },
      { timeout: 3000 },
    )
    expect(wrapper.text()).toContain('你好呀')
    expect(wrapper.find('[data-test="typing-indicator"]').exists()).toBe(true)
    // 输入区仍在（钉底），composer 可继续输入
    expect(wrapper.find('textarea').exists()).toBe(true)
  }, 10_000)

  it('slug 变化（组件复用）重新判定入场态：切到有会话 agent 直达 chat', async () => {
    const { reactive } = await import('vue')
    const route = reactive({ params: { id: 'xiaohuayan' } })
    mocks.route = route
    // 预置编程专家的缓存会话
    sendMessage('biancheng', '编程会话消息')
    const wrapper = mountPage()
    // 初始无会话 → hero
    expect(wrapper.find('h1').exists()).toBe(true)
    // 改 slug（同组件实例复用）→ watch 重判 → 直达编程专家 chat 态
    route.params.id = 'biancheng'
    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('编程会话消息')
      },
      { timeout: 3000 },
    )
    expect(wrapper.find('h1').exists()).toBe(false)
  }, 10_000)
})
