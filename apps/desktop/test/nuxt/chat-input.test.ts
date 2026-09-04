import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatInput from '~/components/chat/chat-input.vue'

/**
 * 聊天输入区组件测试
 * 覆盖：发送按钮禁用态（空/纯空白）、点击与 Enter 发送（修剪 + 清空）、v-model 双向绑定
 */
function mountInput() {
  return mount(ChatInput)
}

function textarea(wrapper: ReturnType<typeof mountInput>) {
  return wrapper.find<HTMLTextAreaElement>('textarea[name="chat-message"]')
}

function sendButton(wrapper: ReturnType<typeof mountInput>) {
  return wrapper.find('button[title="发送"]')
}

describe('ChatInput 发送按钮状态', () => {
  it('初始空文本时发送按钮禁用', () => {
    const wrapper = mountInput()
    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('纯空白文本仍视为空，按钮保持禁用', async () => {
    const wrapper = mountInput()
    await textarea(wrapper).setValue('   ')
    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('输入有效文本后按钮启用', async () => {
    const wrapper = mountInput()
    await textarea(wrapper).setValue('帮我写个周报')
    expect(sendButton(wrapper).attributes('disabled')).toBeUndefined()
  })
})

describe('ChatInput 发送行为', () => {
  it('点击发送：emit 修剪后的文本并清空输入框', async () => {
    const wrapper = mountInput()
    await textarea(wrapper).setValue('  你好  ')
    await sendButton(wrapper).trigger('click')

    expect(wrapper.emitted('send')).toEqual([['你好']])
    expect(textarea(wrapper).element.value).toBe('')
  })

  it('空文本点击发送不触发 send（按钮禁用兜底）', async () => {
    const wrapper = mountInput()
    await sendButton(wrapper).trigger('click')

    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('Enter 键发送：emit 修剪文本并清空输入框', async () => {
    const wrapper = mountInput()
    await textarea(wrapper).setValue('帮我写个周报')
    await textarea(wrapper).trigger('keydown.enter')

    expect(wrapper.emitted('send')).toEqual([['帮我写个周报']])
    expect(textarea(wrapper).element.value).toBe('')
  })

  it('空文本按 Enter 不触发 send', async () => {
    const wrapper = mountInput()
    await textarea(wrapper).trigger('keydown.enter')

    expect(wrapper.emitted('send')).toBeUndefined()
  })
})

describe('ChatInput v-model 绑定', () => {
  it('输入触发 update:modelValue', async () => {
    const wrapper = mountInput()
    await textarea(wrapper).setValue('abc')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['abc'])
  })
})
