import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskComposer from '~/components/TaskComposer.vue'

/**
 * 任务输入组件测试（EmotionBall/NuxtLink 打桩，聚焦输入与选择行为）：
 * 默认渲染、发送链路（空内容禁用/裁剪/清空/回车）、模型选择、Agent 菜单路由
 */
function mountComposer(props: Record<string, unknown> = {}) {
  return mount(TaskComposer, {
    props,
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

// 菜单条目按钮的文本包含「默认」等尾缀，按钮内名字位于第一个 .flex-1 span，选中态（font-medium）也在该 span 上
function findModelButton(wrapper: ReturnType<typeof mountComposer>, name: string) {
  return wrapper.findAll('button').find((button) => button.text().includes(name))
}

describe('TaskComposer', () => {
  it('默认渲染默认 Agent 与默认模型', () => {
    const wrapper = mountComposer()
    expect(wrapper.text()).toContain('小花颜')
    expect(wrapper.text()).toContain('Auto')
  })

  it('自定义 agentName/placeholder 生效', () => {
    const wrapper = mountComposer({
      agentName: '编程专家',
      placeholder: '告诉编程专家你想做什么',
    })
    expect(wrapper.text()).toContain('编程专家')
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('placeholder')).toBe('告诉编程专家你想做什么')
  })

  it('空内容时发送按钮禁用且点击不触发 send', async () => {
    const wrapper = mountComposer()
    const sendButton = wrapper.find('button[title="发送"]')
    expect(sendButton.attributes('disabled')).toBeDefined()
    await sendButton.trigger('click')
    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('输入内容后发送：emit 裁剪后的文本并清空草稿', async () => {
    const wrapper = mountComposer()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('  帮我写个周报  ')
    await wrapper.find('button[title="发送"]').trigger('click')
    const events = wrapper.emitted('send')
    expect(events).toHaveLength(1)
    expect(events?.[0]?.[0]).toBe('帮我写个周报')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })

  it('Enter 键发送（Shift+Enter 不拦截由 textarea 默认换行）', async () => {
    const wrapper = mountComposer()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('hello')
    await textarea.trigger('keydown.enter')
    expect(wrapper.emitted('send')).toHaveLength(1)
  })

  it('选择模型：名字 span 更新选中高亮', async () => {
    const wrapper = mountComposer()
    const autoButton = findModelButton(wrapper, 'Auto')
    expect(autoButton).toBeDefined()
    expect(autoButton?.find('.flex-1').classes()).toContain('font-medium')

    const deepseekButton = findModelButton(wrapper, 'DeepSeek-V4-Flash')
    expect(deepseekButton).toBeDefined()
    await deepseekButton?.trigger('click')

    expect(deepseekButton?.find('.flex-1').classes()).toContain('font-medium')
    expect(autoButton?.find('.flex-1').classes()).not.toContain('font-medium')
  })

  it('Agent 菜单渲染目录并链接到开场页，当前 Agent 高亮', () => {
    const wrapper = mountComposer({ agentSlug: 'xiaohuayan' })
    const link = wrapper.find('a[href="/dashboard/agents/xiaohuayan"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('小花颜')
    expect(link.text()).toContain('默认')
    expect(link.find('.flex-1').classes()).toContain('font-medium')
  })
})
