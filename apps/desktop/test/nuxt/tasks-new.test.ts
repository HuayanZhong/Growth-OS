import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { apiFetch } from '~/composables/useApi'
import { loadAgents, resetAgents } from '~/composables/useAgents'
import type { Agent } from '@growth-os/types'

const DEFAULT_AGENT: Agent = {
  id: 'seed-uuid',
  slug: 'xiaohuayan',
  name: '小花颜',
  isDefault: true,
  emotion: '02',
}

// apiFetch mock 驱动真实 useAgents 单例（对齐 agent-page.test.ts 模式）；
// loadAgents 由 dashboard 布局挂载调用，页面测试中手动调用以进入目标状态
vi.mock('~/composables/useApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/composables/useApi')>()
  return { ...actual, apiFetch: vi.fn() }
})

const mockFetch = vi.mocked(apiFetch)

import TasksNewPage from '~/pages/dashboard/tasks/new.vue'

// TaskComposer 内嵌 EmotionBall 会在 happy-dom 里加载外部脚本并刷屏报错，按既有模式打桩
function mountPage() {
  return mount(TasksNewPage, {
    global: {
      stubs: {
        EmotionBall: {
          props: ['emotion', 'color'],
          template: '<span data-test="emotion-ball" />',
        },
        NuxtLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
      },
    },
  })
}

/**
 * 新任务页四态测试（对标 frontend-auth-boundary / agent-directory 增量规格）：
 * 加载中（无错误/空态文案，不闪现）、加载失败（可重试错误态，不引导"重新登录"）、
 * 目录为空（空态提示）、就绪（发送可用）；错误态点击重试可恢复就绪。
 */
describe('新任务页四态', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetAgents()
  })

  it('加载中：呈现 loading，不闪现错误/空态文案', () => {
    const wrapper = mountPage()

    expect(wrapper.find('[data-test="directory-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="directory-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="empty-directory"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('重新登录')
  })

  it('加载失败：错误提示 + 重试按钮，不出现"重新登录"引导', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'))
    await loadAgents()

    const wrapper = mountPage()

    expect(wrapper.find('[data-test="directory-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="directory-retry"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('目录加载失败')
    expect(wrapper.text()).not.toContain('重新登录')
    expect(wrapper.find('[data-test="directory-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="empty-directory"]').exists()).toBe(false)
  })

  it('错误态点击重试：拉取成功后恢复就绪态（发送可用）', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'))
    await loadAgents()
    const wrapper = mountPage()
    expect(wrapper.find('[data-test="directory-error"]').exists()).toBe(true)

    mockFetch.mockResolvedValue([DEFAULT_AGENT])
    await wrapper.find('[data-test="directory-retry"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="directory-error"]').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('目录为空（加载成功但无默认 Agent）：空态提示，无发送入口', async () => {
    mockFetch.mockResolvedValue([])
    await loadAgents()

    const wrapper = mountPage()

    expect(wrapper.find('[data-test="empty-directory"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无可用 Agent')
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('就绪态：默认 Agent 就位，发送入口可用', async () => {
    mockFetch.mockResolvedValue([DEFAULT_AGENT])
    await loadAgents()

    const wrapper = mountPage()

    expect(wrapper.find('[data-test="directory-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="directory-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="empty-directory"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('小花颜')
    expect(wrapper.find('textarea').exists()).toBe(true)
  })
})
