import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskComposer from '~/components/TaskComposer.vue'

// 组件内目录下拉走服务端目录单例（server-agent-directory）：以 mock apiFetch 灌入目录
vi.mock('~/composables/useApi', () => ({ apiFetch: vi.fn() }))
// 压缩管线 mock（浏览器 API 不在 node 环境运行；管线纯逻辑见 unit/image-compress.test.ts）
vi.mock('~/utils/image-compress', () => ({
  compressImageFile: vi.fn(),
}))
// toast 单例 mock：断言拒绝提示文案
vi.mock('~/composables/useToast', () => ({
  useToast: () => ({ showToast: toastMock }),
}))
import { apiFetch } from '~/composables/useApi'
import { loadAgents } from '~/composables/useAgents'
import { compressImageFile } from '~/utils/image-compress'

const mockFetch = vi.mocked(apiFetch)
const compressMock = vi.mocked(compressImageFile)
const toastMock = vi.fn()

const COMPRESSED: Extract<Awaited<ReturnType<typeof compressImageFile>>, { ok: true }> = {
  ok: true,
  dataUrl: 'data:image/jpeg;base64,YQ==',
  name: 'image_1',
  format: 'jpeg',
  bytes: 123,
}

beforeEach(async () => {
  mockFetch.mockResolvedValue([
    { id: 'seed-uuid', slug: 'xiaohuayan', name: '小花颜', isDefault: true, emotion: '02' },
  ])
  compressMock.mockResolvedValue(COMPRESSED)
  await loadAgents()
})

/**
 * 任务输入组件测试（EmotionBall/NuxtLink 打桩，聚焦输入与选择行为）：
 * 默认渲染、发送链路（空内容禁用/裁剪/清空/回车）、模型选择、Agent 菜单路由
 */
function mountComposer(props: Record<string, unknown> = {}) {
  return mount(TaskComposer, {
    props,
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

// 菜单条目按钮的文本包含「默认」等尾缀，按钮内名字位于第一个 .flex-1 span，选中态（font-medium）也在该 span 上
function findModelButton(wrapper: ReturnType<typeof mountComposer>, name: string) {
  return wrapper.findAll('button').find((button) => button.text().includes(name))
}

function makeImageFile(name = ''): File {
  return new File(['binary'], name, { type: 'image/png' })
}

function makeClipboardItem(file: File) {
  return { kind: 'file', type: file.type, getAsFile: () => file }
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

  it('模型菜单两档：Auto 默认高亮，DeepSeek 手动档可选中', async () => {
    const wrapper = mountComposer()
    const autoButton = findModelButton(wrapper, 'Auto')
    expect(autoButton).toBeDefined()
    expect(autoButton?.find('.flex-1').classes()).toContain('font-medium')
    const deepseekButton = findModelButton(wrapper, 'DeepSeek')
    expect(deepseekButton).toBeDefined()
    await deepseekButton?.trigger('click')
    expect(deepseekButton?.find('.flex-1').classes()).toContain('font-medium')
    expect(autoButton?.find('.flex-1').classes()).not.toContain('font-medium')
  })

  it('模型选择随 send emit：Auto 不带 modelId，手动档携带注册表 id', async () => {
    const wrapper = mountComposer()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('hello')
    await wrapper.find('button[title="发送"]').trigger('click')
    expect(wrapper.emitted('send')?.[0]?.[2]).toBeUndefined()

    await findModelButton(wrapper, 'DeepSeek')?.trigger('click')
    await textarea.setValue('hello again')
    await wrapper.find('button[title="发送"]').trigger('click')
    const events = wrapper.emitted('send')
    expect(events).toHaveLength(2)
    expect(events?.[1]?.[2]).toBe('deepseek-flash')
  })

  it('选择模型 emit model-change（同款不 emit）', async () => {
    const wrapper = mountComposer()
    await findModelButton(wrapper, 'DeepSeek')?.trigger('click')
    expect(wrapper.emitted('model-change')?.[0]).toEqual(['deepseek-flash', 'DeepSeek'])
    // 同款再选：不 emit（分割线去重的组件侧一半）
    await findModelButton(wrapper, 'DeepSeek')?.trigger('click')
    expect(wrapper.emitted('model-change')).toHaveLength(1)
  })

  it('Agent 菜单渲染目录并链接到开场页，当前 Agent 高亮', () => {
    const wrapper = mountComposer({ agentSlug: 'xiaohuayan' })
    const link = wrapper.find('a[href="/dashboard/agents/xiaohuayan"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('小花颜')
    expect(link.text()).toContain('默认')
    expect(link.find('.flex-1').classes()).toContain('font-medium')
  })

  it('showAgentSelector=false 不渲染 Agent 垫层（会话态，切 agent 走侧边栏）', () => {
    const wrapper = mountComposer({ agentSlug: 'xiaohuayan', showAgentSelector: false })
    expect(wrapper.find('a[href="/dashboard/agents/xiaohuayan"]').exists()).toBe(false)
    // 输入卡片仍在（只隐藏垫层）
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  // ---- 图片附件 ----

  async function pasteImage(wrapper: ReturnType<typeof mountComposer>, file: File): Promise<void> {
    await wrapper.find('textarea').trigger('paste', {
      clipboardData: { items: [makeClipboardItem(file)] },
    } as unknown as Event)
  }

  it('粘贴图片：经压缩管线入卡（缩略图/文件名/格式标签），文本粘贴不受影响', async () => {
    const wrapper = mountComposer()

    await pasteImage(wrapper, makeImageFile())
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-test="composer-attachment"]')).toHaveLength(1),
    )
    const card = wrapper.find('[data-test="composer-attachment"]')
    expect(card.find('img').attributes('src')).toBe(COMPRESSED.dataUrl)
    expect(card.text()).toContain('image_1')
    expect(card.text()).toContain('JPEG')
    // 空草稿 + 有附件 → 发送可用
    expect(wrapper.find('button[title="发送"]').attributes('disabled')).toBeUndefined()
    // 文本粘贴（无图片项）不拦截也不入卡
    const before = wrapper.findAll('[data-test="composer-attachment"]').length
    await wrapper.find('textarea').trigger('paste', {
      clipboardData: { items: [{ kind: 'string', type: 'text/plain' }] },
    } as unknown as Event)
    expect(wrapper.findAll('[data-test="composer-attachment"]')).toHaveLength(before)
    expect(toastMock).not.toHaveBeenCalled()
  })

  it('文件选择：隐藏 input change 入卡，保留原始文件名', async () => {
    const wrapper = mountComposer()
    const input = wrapper.find('input[data-test="composer-file-input"]')
    Object.defineProperty(input.element, 'files', { value: [makeImageFile('photo.png')] })
    await input.trigger('change')

    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-test="composer-attachment"]')).toHaveLength(1),
    )
    expect(wrapper.find('[data-test="composer-attachment"]').text()).toContain('photo.png')
  })

  it('发送：emit 携带附件 data URL 并清空附件与草稿', async () => {
    const wrapper = mountComposer()
    await pasteImage(wrapper, makeImageFile())
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-test="composer-attachment"]')).toHaveLength(1),
    )
    await wrapper.find('textarea').setValue('看图说话')
    await wrapper.find('button[title="发送"]').trigger('click')

    const events = wrapper.emitted('send')
    expect(events).toHaveLength(1)
    expect(events?.[0]?.[0]).toBe('看图说话')
    expect(events?.[0]?.[1]).toEqual([COMPRESSED.dataUrl])
    expect(wrapper.findAll('[data-test="composer-attachment"]')).toHaveLength(0)
  })

  it('删除附件：仅移除目标卡片，其余保留', async () => {
    const wrapper = mountComposer()
    await pasteImage(wrapper, makeImageFile())
    await pasteImage(wrapper, makeImageFile())
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-test="composer-attachment"]')).toHaveLength(2),
    )

    await wrapper.findAll('[data-test="attachment-remove"]')[0]!.trigger('click')
    expect(wrapper.findAll('[data-test="composer-attachment"]')).toHaveLength(1)
  })

  it('超过 4 张：提示上限且多余图片不入卡', async () => {
    const wrapper = mountComposer()
    for (let i = 0; i < 5; i += 1) {
      await pasteImage(wrapper, makeImageFile())
    }
    await vi.waitFor(() => expect(toastMock).toHaveBeenCalledWith('最多添加 4 张图片', 'error'))
    expect(wrapper.findAll('[data-test="composer-attachment"]')).toHaveLength(4)
  })

  it('压缩拒绝：呈现对应文案（超限/格式/解码失败），不入卡', async () => {
    const wrapper = mountComposer()
    compressMock.mockResolvedValue({ ok: false, reason: 'too_large' })
    await pasteImage(wrapper, makeImageFile())
    await vi.waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith('图片超过 25MB，请压缩后再试', 'error'),
    )

    compressMock.mockResolvedValue({ ok: false, reason: 'unsupported_type' })
    await pasteImage(wrapper, makeImageFile())
    await vi.waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith('仅支持 JPEG/PNG/GIF/WebP 图片', 'error'),
    )

    compressMock.mockResolvedValue({ ok: false, reason: 'undecodable' })
    await pasteImage(wrapper, makeImageFile())
    await vi.waitFor(() => expect(toastMock).toHaveBeenCalledWith('图片无法识别', 'error'))
    expect(wrapper.findAll('[data-test="composer-attachment"]')).toHaveLength(0)
  })

  it('仅附件无文本可发送：emit 空文本 + 图片', async () => {
    const wrapper = mountComposer()
    await pasteImage(wrapper, makeImageFile())
    await vi.waitFor(() =>
      expect(wrapper.findAll('[data-test="composer-attachment"]')).toHaveLength(1),
    )
    await wrapper.find('button[title="发送"]').trigger('click')

    const events = wrapper.emitted('send')
    expect(events?.[0]?.[0]).toBe('')
    expect(events?.[0]?.[1]).toEqual([COMPRESSED.dataUrl])
  })
})
