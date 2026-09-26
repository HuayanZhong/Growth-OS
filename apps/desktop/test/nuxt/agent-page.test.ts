import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mocks = vi.hoisted(() => ({
  route: { params: { id: 'xiaohuayan' } } as { params: { id: string } },
}))

mockNuxtImport('useRoute', () => () => mocks.route)

import AgentPage from '~/pages/dashboard/agents/[id].vue'

/**
 * Agent 任务开场页测试（EmotionBall/NuxtLink 打桩）：
 * 合法 slug 渲染对应 Agent 问候与输入区；未知 slug 抛 404
 */
function mountPage() {
  return mount(AgentPage, {
    global: {
      stubs: {
        EmotionBall: { template: '<span data-test="emotion-ball" />' },
        NuxtLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
      },
    },
  })
}

describe('Agent 任务开场页', () => {
  it('合法 slug 渲染 Agent 问候语与输入区', () => {
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('今天想让')
    expect(wrapper.text()).toContain('小花颜')
    expect(wrapper.text()).toContain('搞定哪件事？')
    expect(wrapper.find('textarea').attributes('placeholder')).toBe(
      '告诉小花颜，你想先从哪件事开始…',
    )
  })

  it('未知 slug 抛 404', () => {
    mocks.route = { params: { id: 'ghost' } }
    expect(() => mountPage()).toThrow()
  })
})
