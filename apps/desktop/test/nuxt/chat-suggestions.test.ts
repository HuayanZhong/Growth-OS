import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatSuggestions from '~/components/chat/chat-suggestions.vue'

/**
 * 引导问题卡片组件测试
 * 覆盖：引导文案、建议列表渲染、点击建议触发 select 事件
 */
function mountSuggestions() {
  return mount(ChatSuggestions, {
    props: { suggestions: ['帮我写周报', '总结这个项目'] },
  })
}

describe('ChatSuggestions', () => {
  it('渲染引导文案与头像', () => {
    const wrapper = mountSuggestions()

    expect(wrapper.find('.chat.chat-start').exists()).toBe(true)
    expect(wrapper.find('.chat-image.avatar').exists()).toBe(true)
    expect(wrapper.text()).toContain('你可以让我帮你')
  })

  it('按 props 渲染全部建议按钮', () => {
    const wrapper = mountSuggestions()
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.text()).toBe('帮我写周报')
    expect(buttons[1]!.text()).toBe('总结这个项目')
  })

  it('点击建议触发 select 事件并携带建议文本', async () => {
    const wrapper = mountSuggestions()

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['总结这个项目']])
  })
})
