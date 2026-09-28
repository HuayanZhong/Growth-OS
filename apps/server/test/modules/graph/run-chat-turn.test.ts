import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDeepAgent } from 'deepagents'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { createChatTurnRunner } from '../../../src/modules/graph/run-chat-turn.ts'
import type { GraphEvent } from '../../../src/modules/graph/graph-event.ts'

/**
 * 回合执行器：deepagents mock（不真调外部服务）。v3 流式投影
 * （run.messages → msg.text）映射为 GraphEvent；signal 与消息历史透传。
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

  it('deepagents 以工厂产出的模型与空 tools 装配', () => {
    createChatTurnRunner(() => FAKE_MODEL)

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
})
