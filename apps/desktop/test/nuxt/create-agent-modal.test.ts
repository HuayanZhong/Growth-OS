import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mocks = vi.hoisted(() => ({
  navigateTo: vi.fn(),
}))

mockNuxtImport('navigateTo', () => mocks.navigateTo)

import CreateAgentModal from '~/components/agents/CreateAgentModal.vue'
import { initAgents, useAgents } from '~/composables/useAgents'

/**
 * 创建 Agent 弹窗测试（EmotionBall 打桩、navigateTo mock）：
 * 打开初始态、名称必填校验、点选表情/颜色实时预览、创建追加目录并跳转、取消丢弃
 */
function mountModal() {
  return mount(CreateAgentModal, {
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

// defineExpose 的 open：经 vm 代理调用（unknown 收窄，不用 any）
function openModal(wrapper: ReturnType<typeof mountModal>) {
  ;(wrapper.vm as unknown as { open: () => void }).open()
}

describe('CreateAgentModal', () => {
  beforeEach(() => {
    // 隔离：目录重置为仅内置；navigateTo 清空调用记录
    initAgents(null)
    mocks.navigateTo.mockClear()
  })

  it('打开为初始态：预览默认待机表情与默认色、扩展能力为占位文案、创建按钮禁用', () => {
    const wrapper = mountModal()
    openModal(wrapper)
    const preview = wrapper.find('[data-test="preview"] [data-test="emotion-ball"]')
    expect(preview.attributes('data-emotion')).toBe('02')
    expect(preview.attributes('data-color')).toBe('#F6EFE4')
    // 未选择技能：扩展能力条显示占位文案，不显示分类 chip
    expect(wrapper.text()).toContain('添加扩展能力（插件、技能和 MCP）')
    expect(wrapper.find('button[aria-label="选择技能"]').exists()).toBe(false)
    const createButton = wrapper.findAll('button').find((button) => button.text() === '创建')
    expect(createButton?.attributes('disabled')).toBeDefined()
  })

  it('名称有效后创建按钮可用', async () => {
    const wrapper = mountModal()
    openModal(wrapper)
    const createButton = wrapper.findAll('button').find((button) => button.text() === '创建')
    expect(createButton?.attributes('disabled')).toBeDefined()
    await wrapper.find('input[type="text"]').setValue('写作助手')
    expect(createButton?.attributes('disabled')).toBeUndefined()
  })

  it('点选表情网格：预览球实时切换', async () => {
    const wrapper = mountModal()
    openModal(wrapper)
    await wrapper.find('button[aria-label="形象：开心"]').trigger('click')
    expect(
      wrapper.find('[data-test="preview"] [data-test="emotion-ball"]').attributes('data-emotion'),
    ).toBe('10')
  })

  it('点选色板：预览球实时换色', async () => {
    const wrapper = mountModal()
    openModal(wrapper)
    await wrapper.find('button[aria-label="颜色：雾蓝"]').trigger('click')
    expect(
      wrapper.find('[data-test="preview"] [data-test="emotion-ball"]').attributes('data-color'),
    ).toBe('#CFE2F4')
  })

  it('创建：追加目录（含表情/颜色/描述/技能）并跳转新开场页', async () => {
    const wrapper = mountModal()
    openModal(wrapper)
    await wrapper.find('input[type="text"]').setValue('  写作助手  ')
    await wrapper.find('textarea').setValue('帮我写文章')
    await wrapper.find('button[aria-label="形象：开心"]').trigger('click')
    await wrapper.find('button[aria-label="颜色：雾蓝"]').trigger('click')

    // 扩展能力：＋ 打开扩展选择弹窗（嵌套 dialog）→ 添加两项 → 确定回填
    await wrapper.find('button[aria-label="添加技能"]').trigger('click')
    const picker = wrapper.findAll('dialog')[1]
    expect(picker).toBeDefined()
    await picker?.find('button[aria-label="添加：联网搜索"]').trigger('click')
    await picker?.find('button[aria-label="添加：知识库"]').trigger('click')
    await picker
      ?.findAll('button')
      .find((button) => button.text() === '确定')
      ?.trigger('click')

    expect(wrapper.find('button[aria-label="选择技能"]').text()).toContain('+2')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '创建')
      ?.trigger('click')

    // 创建后弹窗必须关闭（弹窗挂载于持久布局，路由切换不会卸载它）
    expect(wrapper.find('dialog[open]').exists()).toBe(false)

    const { agents } = useAgents()
    const created = agents.value.find((agent) => agent.name === '写作助手')
    expect(created?.slug).toMatch(/^agent-/)
    expect(created?.isDefault).toBe(false)
    expect(created?.emotion).toBe('10')
    expect(created?.color).toBe('#CFE2F4')
    expect(created?.description).toBe('帮我写文章')
    expect(created?.skills).toEqual(['web-search', 'knowledge'])
    expect(mocks.navigateTo).toHaveBeenCalledTimes(1)
    expect(mocks.navigateTo).toHaveBeenCalledWith(`/dashboard/agents/${created?.slug}`)
  })

  it('扩展选择弹窗：搜索过滤生效，取消不回填', async () => {
    const wrapper = mountModal()
    openModal(wrapper)
    await wrapper.find('button[aria-label="添加技能"]').trigger('click')
    const picker = wrapper.findAll('dialog')[1]
    expect(picker).toBeDefined()

    await picker?.find('input[placeholder="搜索技能"]').setValue('知识')
    expect(picker?.find('button[aria-label="添加：知识库"]').exists()).toBe(true)
    expect(picker?.find('button[aria-label="添加：联网搜索"]').exists()).toBe(false)

    // 添加一项后取消：扩展能力区不回填（未选状态回落为占位文案，无分类 chip）
    await picker?.find('button[aria-label="添加：知识库"]').trigger('click')
    await picker
      ?.findAll('button')
      .find((button) => button.text() === '取消')
      ?.trigger('click')
    expect(wrapper.find('button[aria-label="选择技能"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('添加扩展能力（插件、技能和 MCP）')
  })

  it('取消丢弃：不新增目录、不跳转，再次打开表单已重置', async () => {
    const wrapper = mountModal()
    openModal(wrapper)
    await wrapper.find('input[type="text"]').setValue('草稿 Agent')
    const cancelButton = wrapper.findAll('button').find((button) => button.text() === '取消')
    await cancelButton?.trigger('click')

    const { agents } = useAgents()
    expect(agents.value.some((agent) => agent.name === '草稿 Agent')).toBe(false)
    expect(mocks.navigateTo).not.toHaveBeenCalled()

    openModal(wrapper)
    await nextTick()
    expect((wrapper.find('input[type="text"]').element as HTMLInputElement).value).toBe('')
  })
})
