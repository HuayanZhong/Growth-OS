import { beforeEach, describe, expect, it, vi } from 'vitest'
import { watch } from 'vue'
import { apiStream } from '~/composables/useApi'
import type { ChatStreamEvent } from '@growth-os/types'
import {
  consumePending,
  getSession,
  hasSession,
  isGenerating,
  resetAgentChat,
  sendMessage,
  stagePending,
  stopGenerating,
} from '~/composables/useAgentChat'

/**
 * Agent 会话状态（useAgentChat）测试（Nuxt 运行时环境：useAgentChat 经
 * useApi 的 useRuntimeConfig/useSupabase 自动导入发起流式请求，node 环境
 * 跑不了，故归 test/nuxt，与 use-agents.test.ts 同一模式）：
 * - 发送追加（用户消息 + typing 占位）、slug 隔离、pending 交接（既有行为）；
 * - 流式数据源：增量打字机原位渲染、请求携带会话历史、
 *   停止保留部分文本、error 事件回调、请求失败呈现。
 * apiStream 以 vi.mock 注入（不触真实网络）；会话过期的本地登出降级在
 * useApi 内部实现（use-api.test.ts 覆盖），此处断言错误经 onError 冒泡。
 */

vi.mock('~/composables/useApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/composables/useApi')>()
  return { ...actual, apiStream: vi.fn() }
})

const mockApiStream = vi.mocked(apiStream)

function sseResponse(events: ChatStreamEvent[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

const runEvent = (delta: string): ChatStreamEvent => ({
  type: 'text_message_content',
  messageId: 'm1',
  delta,
})

describe('Agent 会话状态（useAgentChat）', () => {
  beforeEach(() => {
    // 隔离：每例清空模块级单例（会话 + pending + 生成中请求）
    vi.resetAllMocks()
    resetAgentChat()
  })

  it('sendMessage 追加用户消息与 agent typing 占位', () => {
    mockApiStream.mockResolvedValue(sseResponse([]))
    sendMessage('xiaohuayan', '  帮我写个周报  ')
    const { messages } = getSession('xiaohuayan')!
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ role: 'user', kind: 'text', text: '帮我写个周报' })
    expect(messages[1]).toMatchObject({ role: 'agent', kind: 'typing', text: '' })
    // 每条消息带创建时间戳（日期分割线数据来源）
    expect(typeof messages[0]?.createdAt).toBe('number')
  })

  it('生成中连续发送被忽略：仅首条入列，占位保留', () => {
    mockApiStream.mockResolvedValue(sseResponse([]))
    sendMessage('xiaohuayan', '第一条')
    sendMessage('xiaohuayan', '第二条')
    const { messages } = getSession('xiaohuayan')!
    expect(messages.map((message) => [message.role, message.kind])).toEqual([
      ['user', 'text'],
      ['agent', 'typing'],
    ])
    expect(messages[0]?.text).toBe('第一条')
  })

  it('会话按 slug 隔离', () => {
    mockApiStream.mockResolvedValue(sseResponse([]))
    sendMessage('xiaohuayan', '给小花颜')
    sendMessage('biancheng', '给编程专家')
    expect(getSession('xiaohuayan')?.messages.some((m) => m.text === '给小花颜')).toBe(true)
    expect(getSession('xiaohuayan')?.messages.some((m) => m.text === '给编程专家')).toBe(false)
    expect(hasSession('xiaohuayan')).toBe(true)
    expect(hasSession('ghost')).toBe(false)
  })

  it('hasSession 以消息流非空为准：无会话与空会话都视为不存在', () => {
    mockApiStream.mockResolvedValue(sseResponse([]))
    expect(hasSession('xiaohuayan')).toBe(false)
    expect(getSession('xiaohuayan')).toBeUndefined()
    sendMessage('xiaohuayan', 'hello')
    expect(hasSession('xiaohuayan')).toBe(true)
  })

  it('空文本/纯空白发送不产生任何消息', () => {
    sendMessage('xiaohuayan', '   ')
    expect(getSession('xiaohuayan')).toBeUndefined()
  })

  it('pending 命中当前 slug 时消费并清空', () => {
    stagePending('xiaohuayan', '首发内容')
    expect(consumePending('xiaohuayan')).toBe('首发内容')
    // 消费即清空：二次消费为空
    expect(consumePending('xiaohuayan')).toBeNull()
  })

  it('pending 未命中（改道其他 agent）丢弃并返回 null', () => {
    stagePending('xiaohuayan', '本想给小花颜')
    expect(consumePending('biancheng')).toBeNull()
    // 已丢弃：回到目标 agent 也不会再拿到
    expect(consumePending('xiaohuayan')).toBeNull()
  })

  it('stagePending 覆盖旧暂存（同一时刻至多一条）', () => {
    stagePending('xiaohuayan', '旧')
    stagePending('biancheng', '新')
    expect(consumePending('biancheng')).toBe('新')
    // 已被「新」覆盖并被消费：旧目标拿不到任何内容
    expect(consumePending('xiaohuayan')).toBeNull()
  })

  it('resetAgentChat 清空会话与 pending', () => {
    mockApiStream.mockResolvedValue(sseResponse([]))
    sendMessage('xiaohuayan', 'hello')
    stagePending('xiaohuayan', 'draft')
    resetAgentChat()
    expect(hasSession('xiaohuayan')).toBe(false)
    expect(consumePending('xiaohuayan')).toBeNull()
  })

  // ---- 流式数据源 ----

  it('流式回复：增量原位替换 typing 占位（打字机），完成后 isGenerating 归 false', async () => {
    mockApiStream.mockResolvedValue(
      sseResponse([
        { type: 'run_started', runId: 'r1' },
        { type: 'text_message_start', messageId: 'm1' },
        runEvent('你'),
        runEvent('好'),
        { type: 'text_message_end', messageId: 'm1' },
        { type: 'run_finished', runId: 'r1' },
      ]),
    )
    sendMessage('xiaohuayan', '你好呀')
    const placeholder = getSession('xiaohuayan')!.messages[1]!

    await vi.waitFor(() => {
      expect(placeholder.kind).toBe('text')
      expect(placeholder.text).toBe('你好')
    })
    await vi.waitFor(() => expect(isGenerating('xiaohuayan')).toBe(false))
    // 增量渲染未重排消息流
    expect(getSession('xiaohuayan')!.messages).toHaveLength(2)
  })

  it('流式增量逐条触发响应式更新（不整段等待）', async () => {
    mockApiStream.mockResolvedValue(sseResponse([runEvent('你'), runEvent('好'), runEvent('呀')]))
    sendMessage('xiaohuayan', 'hi')
    const placeholder = getSession('xiaohuayan')!.messages[1]!

    // flush:'sync' 的 watcher 逐次记录占位文本变化：若泵改写的是非响应式对象，
    // watcher 一次都不触发（历史上真实发生过：表现为等全部返回才整段显示）
    const snapshots: string[] = []
    watch(
      () => placeholder.text,
      (text) => snapshots.push(text),
      { flush: 'sync' },
    )

    await vi.waitFor(() => expect(isGenerating('xiaohuayan')).toBe(false))
    expect(snapshots).toEqual(['你', '你好', '你好呀'])
  })

  it('生成中新发送被忽略（顺序保护），完成后恢复接受', async () => {
    const encoder = new TextEncoder()
    let close: (() => void) | undefined
    mockApiStream.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(runEvent('第一条'))}\n\n`))
              close = () => controller.close()
            },
          })
          resolve(new Response(body, { status: 200 }))
        }),
    )
    sendMessage('xiaohuayan', '第一条')
    await vi.waitFor(() => expect(getSession('xiaohuayan')!.messages[1]!.text).toBe('第一条'))

    // 生成中发送被忽略：消息不入列、不开启新请求
    sendMessage('xiaohuayan', '第二条')
    expect(getSession('xiaohuayan')!.messages.map((m) => m.text)).toEqual(['第一条', '第一条'])
    expect(mockApiStream).toHaveBeenCalledTimes(1)

    // 完成后恢复接受
    close?.()
    await vi.waitFor(() => expect(isGenerating('xiaohuayan')).toBe(false))
    sendMessage('xiaohuayan', '第二条')
    await vi.waitFor(() =>
      expect(getSession('xiaohuayan')!.messages.some((m) => m.text === '第二条')).toBe(true),
    )
    expect(mockApiStream).toHaveBeenCalledTimes(2)
  })

  it('请求体携带内存会话历史（typing 占位不入历史）', async () => {
    mockApiStream.mockResolvedValue(sseResponse([]))
    sendMessage('xiaohuayan', '第一轮')
    await vi.waitFor(() => expect(isGenerating('xiaohuayan')).toBe(false))
    sendMessage('xiaohuayan', '第二轮')
    await vi.waitFor(() => expect(isGenerating('xiaohuayan')).toBe(false))

    const options = mockApiStream.mock.calls.at(-1)![1]!
    expect(options.body).toEqual({
      agentSlug: 'xiaohuayan',
      messages: [
        { role: 'user', content: '第一轮' },
        { role: 'user', content: '第二轮' },
      ],
    })
  })

  it('停止生成：中止流并保留已收到的部分文本', async () => {
    // 首帧后挂起：模拟生成中的长流
    const encoder = new TextEncoder()
    let stop: (() => void) | undefined
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(runEvent('部分'))}\n\n`))
        stop = () => controller.close()
      },
    })
    mockApiStream.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          // 挂住的流：由 AbortSignal 触发收尾（fetch 语义）
          void stop
          resolve(new Response(body, { status: 200 }))
        }),
    )
    sendMessage('xiaohuayan', '写首诗')
    const placeholder = getSession('xiaohuayan')!.messages[1]!

    await vi.waitFor(() => expect(placeholder.text).toBe('部分'))
    stopGenerating('xiaohuayan')
    stop?.()

    await vi.waitFor(() => expect(isGenerating('xiaohuayan')).toBe(false))
    // 部分文本保留为正式气泡，不再增长
    expect(placeholder.kind).toBe('text')
    expect(placeholder.text).toBe('部分')
  })

  it('服务端 error 事件经 onError 呈现，部分文本保留', async () => {
    const onError = vi.fn()
    mockApiStream.mockResolvedValue(
      sseResponse([
        runEvent('半截'),
        { type: 'error', code: 'CHAT_STREAM_FAILED', message: '回复生成失败，请稍后重试' },
      ]),
    )
    sendMessage('xiaohuayan', 'hi', onError)
    const placeholder = getSession('xiaohuayan')!.messages[1]!

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('回复生成失败，请稍后重试'))
    expect(placeholder.text).toBe('半截')
  })

  it('请求失败（含会话过期）经 onError 冒泡呈现', async () => {
    const onError = vi.fn()
    mockApiStream.mockRejectedValue(new Error('登录已失效，请重新登录'))
    sendMessage('xiaohuayan', 'hi', onError)

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('登录已失效，请重新登录'))
  })
})
