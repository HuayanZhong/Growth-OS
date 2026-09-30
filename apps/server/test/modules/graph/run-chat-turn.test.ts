import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDeepAgent } from 'deepagents'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { createChatTurnRunner } from '../../../src/modules/graph/run-chat-turn.ts'
import type { GraphEvent } from '../../../src/modules/graph/graph-event.ts'
import { DEEPSEEK_PROVIDER } from '../../../src/modules/model-provider/registry.ts'

/**
 * 回合执行器：deepagents mock（不真调外部服务）。v3 流式投影
 * （run.messages → msg.text）映射为 GraphEvent；signal 与消息历史透传。
 * 分段映射与 Auto 路由：视觉模型透传 image block、非视觉模型降级占位、
 * Auto 含图选视觉模型 / 纯文本走默认模型、显式 modelId 优先。
 */
const { streamEventsMock } = vi.hoisted(() => ({ streamEventsMock: vi.fn() }))

vi.mock('deepagents', () => ({
  createDeepAgent: vi.fn(() => ({ streamEvents: streamEventsMock })),
}))

function makeFakeRun(messagesTokens: string[][]) {
  return {
    messages: (async function* () {
      for (const tokens of messagesTokens) {
        yield {
          text: (async function* () {
            for (const token of tokens) yield token
          })(),
        }
      }
    })(),
  }
}

async function collect(run: AsyncIterable<GraphEvent>): Promise<GraphEvent[]> {
  const events: GraphEvent[] = []
  for await (const event of run) events.push(event)
  return events
}

const FAKE_MODEL = { _fake: 'model' } as unknown as BaseChatModel

const IMAGE_PART = {
  type: 'image_url',
  imageUrl: { url: 'data:image/png;base64,aGk=' },
} as const

describe('createChatTurnRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    streamEventsMock.mockResolvedValue(makeFakeRun([['你', '好']]))
  })

  it('文本 token 映射为 text_delta，回合结束产出 turn_end', async () => {
    const runner = createChatTurnRunner(() => FAKE_MODEL)
    const signal = new AbortController().signal

    const events = await collect(runner({ messages: [{ role: 'user', content: 'hi' }] }, signal))

    expect(events).toEqual([
      { type: 'text_delta', delta: '你' },
      { type: 'text_delta', delta: '好' },
      { type: 'turn_end' },
    ])
  })

  it('空回复也以 turn_end 收尾', async () => {
    streamEventsMock.mockResolvedValue(makeFakeRun([[]]))
    const runner = createChatTurnRunner(() => FAKE_MODEL)

    const events = await collect(
      runner({ messages: [{ role: 'user', content: 'hi' }] }, new AbortController().signal),
    )

    expect(events).toEqual([{ type: 'turn_end' }])
  })

  it('消息历史与 AbortSignal 透传 deepagents', async () => {
    const runner = createChatTurnRunner(() => FAKE_MODEL)
    const controller = new AbortController()
    const input = {
      messages: [
        { role: 'assistant', content: '上一轮' },
        { role: 'user', content: '本轮' },
      ] as const,
    }

    await collect(runner(input, controller.signal))

    expect(streamEventsMock).toHaveBeenCalledWith(
      {
        messages: [
          { role: 'assistant', content: '上一轮' },
          { role: 'user', content: '本轮' },
        ],
      },
      { version: 'v3', signal: controller.signal },
    )
  })

  it('每回合以工厂产出的模型与空 tools 装配 agent', async () => {
    const runner = createChatTurnRunner(() => FAKE_MODEL)

    await collect(
      runner({ messages: [{ role: 'user', content: 'hi' }] }, new AbortController().signal),
    )

    expect(vi.mocked(createDeepAgent)).toHaveBeenCalledWith({
      model: FAKE_MODEL,
      tools: [],
    })
  })

  it('上游中断错误不吞掉：原样向调用方传播', async () => {
    streamEventsMock.mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'))
    const runner = createChatTurnRunner(() => FAKE_MODEL)

    await expect(
      collect(
        runner({ messages: [{ role: 'user', content: 'hi' }] }, new AbortController().signal),
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  // ---- Auto 路由 ----

  it('Auto：纯文本请求走注册表默认模型', async () => {
    const modelIds: string[] = []
    const runner = createChatTurnRunner((id) => {
      modelIds.push(id)
      return FAKE_MODEL
    })

    await collect(
      runner({ messages: [{ role: 'user', content: 'hi' }] }, new AbortController().signal),
    )

    expect(modelIds).toEqual([DEEPSEEK_PROVIDER.defaultModel])
  })

  it('Auto：携带图片分段的消息路由至视觉模型，分段透传为 LangChain blocks', async () => {
    const modelIds: string[] = []
    const runner = createChatTurnRunner((id) => {
      modelIds.push(id)
      return FAKE_MODEL
    })

    await collect(
      runner(
        {
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: '看图' }, IMAGE_PART],
            },
          ],
        },
        new AbortController().signal,
      ),
    )

    expect(modelIds).toEqual([DEEPSEEK_PROVIDER.models[0]!.id])
    expect(streamEventsMock).toHaveBeenCalledWith(
      {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '看图' },
              { type: 'image_url', image_url: { url: IMAGE_PART.imageUrl.url } },
            ],
          },
        ],
      },
      expect.objectContaining({ version: 'v3' }),
    )
  })

  it('Auto：历史早期消息带图同样触发视觉模型路由', async () => {
    const modelIds: string[] = []
    const runner = createChatTurnRunner((id) => {
      modelIds.push(id)
      return FAKE_MODEL
    })

    await collect(
      runner(
        {
          messages: [
            { role: 'user', content: [IMAGE_PART] },
            { role: 'assistant', content: '看到了' },
            { role: 'user', content: '追问' },
          ],
        },
        new AbortController().signal,
      ),
    )

    expect(modelIds).toEqual([DEEPSEEK_PROVIDER.models[0]!.id])
  })

  // ---- 显式模型与能力守卫 ----

  it('显式 modelId 优先于 Auto 路由', async () => {
    const modelIds: string[] = []
    const runner = createChatTurnRunner((id) => {
      modelIds.push(id)
      return FAKE_MODEL
    })

    await collect(
      runner(
        {
          modelId: DEEPSEEK_PROVIDER.models[1]!.id,
          messages: [{ role: 'user', content: 'hi' }],
        },
        new AbortController().signal,
      ),
    )

    expect(modelIds).toEqual([DEEPSEEK_PROVIDER.models[1]!.id])
  })

  it('非视觉模型：image 段降级为文本占位，对话不中断', async () => {
    const runner = createChatTurnRunner(() => FAKE_MODEL)

    await collect(
      runner(
        {
          modelId: DEEPSEEK_PROVIDER.models[1]!.id,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: '看图' }, IMAGE_PART],
            },
          ],
        },
        new AbortController().signal,
      ),
    )

    expect(streamEventsMock).toHaveBeenCalledWith(
      {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '看图' },
              { type: 'text', text: '[图片]' },
            ],
          },
        ],
      },
      expect.anything(),
    )
  })

  it('字符串分段混排历史：字符串消息原样、分段消息逐段映射', async () => {
    const runner = createChatTurnRunner(() => FAKE_MODEL)

    await collect(
      runner(
        {
          messages: [
            { role: 'assistant', content: '之前说过' },
            { role: 'user', content: [{ type: 'text', text: '现在看图' }, IMAGE_PART] },
          ],
        },
        new AbortController().signal,
      ),
    )

    expect(streamEventsMock).toHaveBeenCalledWith(
      {
        messages: [
          { role: 'assistant', content: '之前说过' },
          {
            role: 'user',
            content: [
              { type: 'text', text: '现在看图' },
              { type: 'image_url', image_url: { url: IMAGE_PART.imageUrl.url } },
            ],
          },
        ],
      },
      expect.anything(),
    )
  })
})
