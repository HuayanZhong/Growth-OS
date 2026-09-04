import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatMessageItem from '~/components/chat/chat-message-item.vue'

/**
 * 单条聊天消息组件测试
 * 覆盖：AI 消息（chat-start + 头像）、用户消息（chat-end + 无头像）、气泡内容渲染、
 * 挂载 GSAP 入场动画不报错（动画本身只动 transform/opacity，不锁内部时序）
 */
function mountItem(role: 'user' | 'assistant', content: string) {
  return mount(ChatMessageItem, {
    props: { message: { role, content } },
  })
}

describe('ChatMessageItem 渲染结构', () => {
  it('AI 消息：chat-start 定位 + 头像 + 气泡渲染内容', () => {
    const wrapper = mountItem('assistant', '这是 AI 的回复')

    expect(wrapper.find('.chat.chat-start').exists()).toBe(true)
    expect(wrapper.find('.chat-image.avatar').exists()).toBe(true)
    expect(wrapper.find('.chat-bubble').text()).toBe('这是 AI 的回复')
  })

  it('用户消息：chat-end 定位 + 无头像 + 气泡渲染内容', () => {
    const wrapper = mountItem('user', '这是用户的提问')

    expect(wrapper.find('.chat.chat-end').exists()).toBe(true)
    expect(wrapper.find('.chat-image.avatar').exists()).toBe(false)
    expect(wrapper.find('.chat-bubble').text()).toBe('这是用户的提问')
  })

  it('两种角色挂载动画均不抛错（GSAP fromTo 正常执行）', () => {
    expect(() => mountItem('user', 'a')).not.toThrow()
    expect(() => mountItem('assistant', 'b')).not.toThrow()
  })
})
