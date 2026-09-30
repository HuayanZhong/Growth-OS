import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatStreamEvent, CreateChatStreamInput } from '@growth-os/types'
import { ChatStreamService } from '../../../src/modules/chat/chat-stream.service.ts'
import type { ChatTurnRunner } from '../../../src/modules/graph/run-chat-turn.ts'
import type { GraphEvent } from '../../../src/modules/graph/graph-event.ts'

/**
 * 流式编排（唯一事件汇聚点）：帧序、模型失败 → error 事件、中断静默收尾、
 * 非 chat 意图拦截（占位恒 chat；以 mock 模拟 H3 扩展后的分发形态）。
 * 全程 mock 回合执行器，不真调外部服务。
 */
const { analyzeIntentMock } = vi.hoisted(() => ({ analyzeIntentMock: vi.fn() }))

vi.mock('../../../src/modules/chat/intent.ts', () => ({
  analyzeIntent: analyzeIntentMock,
}))

const INPUT: CreateChatStreamInput = {
  agentSlug: 'xiaohuayan',
  messages: [{ role: 'user', content: '你好' }],
}

const turnMock = vi.fn<(input: unknown, signal: AbortSignal) => AsyncIterable<GraphEvent>>()

function makeService(): ChatStreamService {
  return new ChatStreamService(turnMock as unknown as ChatTurnRunner)
}

async function collect(run: AsyncIterable<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = []
  for await (const event of run) events.push(event)
  return events
}

function makeTurn(
  deltas: string[],
): (input: unknown, signal: AbortSignal) => AsyncIterable<GraphEvent> {
  return (_input: unknown, _signal: AbortSignal) =>
    (async function* (): AsyncGenerator<GraphEvent> {
      for (const delta of deltas) {
        yield { type: 'text_delta', delta }
      }
      yield { type: 'turn_end' }
    })()
}

describe('ChatStreamService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    analyzeIntentMock.mockReturnValue({ type: 'chat' })
  })

  it('正常回复的事件序：run_started → start → content* → end → run_finished', async () => {
    turnMock.mockImplementation(makeTurn(['你', '好']))
    const service = makeService()

    const events = await collect(service.run(INPUT, new AbortController().signal))

    expect(events).toHaveLength(6)
    expect(events[0]).toMatchObject({ type: 'run_started' })
    expect(events[1]).toMatchObject({ type: 'text_message_start' })
    expect(events[2]).toMatchObject({ type: 'text_message_content', delta: '你' })
    expect(events[3]).toMatchObject({ type: 'text_message_content', delta: '好' })
    const messageId = (events[1] as { messageId: string }).messageId
    const runId = (events[0] as { runId: string }).runId
    expect(events[4]).toEqual({ type: 'text_message_end', messageId })
    expect(events[5]).toEqual({ type: 'run_finished', runId })
    expect(events[2]).toMatchObject({ messageId })
  })

  it('run_finished 无 usage（S 期不计量，字段留位）', async () => {
    turnMock.mockImplementation(makeTurn(['好']))
    const service = makeService()

    const events = await collect(service.run(INPUT, new AbortController().signal))
    const finish = events.at(-1) as { type: string; usage?: unknown }

    expect(finish.type).toBe('run_finished')
    expect(finish).not.toHaveProperty('usage')
  })

  it('模型中途失败：下发 error 事件后收流，不向外抛出不泄露内部细节', async () => {
    turnMock.mockImplementation(
      () =>
        (async function* () {
          yield { type: 'text_delta', delta: '部分' }
          throw new Error('deepseek-internal-5xx')
        })() as AsyncIterable<GraphEvent>,
    )
    const service = makeService()

    const events = await collect(service.run(INPUT, new AbortController().signal))

    const last = events.at(-1)!
    expect(last).toMatchObject({ type: 'error', code: 'CHAT_STREAM_FAILED' })
    expect(JSON.stringify(last)).not.toContain('deepseek-internal-5xx')
    expect(events.some((e) => e.type === 'run_finished')).toBe(false)
  })

  it('客户端中断：静默收尾，不发 error 也不发收尾帧', async () => {
    const controller = new AbortController()
    turnMock.mockImplementation(
      (_input, signal) =>
        (async function* () {
          yield { type: 'text_delta', delta: 'a' }
          if (signal.aborted) return
          controller.abort()
          yield { type: 'text_delta', delta: 'b' }
        })() as AsyncIterable<GraphEvent>,
    )
    const service = makeService()

    const events = await collect(service.run(INPUT, controller.signal))

    expect(events).toEqual([
      expect.objectContaining({ type: 'run_started' }),
      expect.objectContaining({ type: 'text_message_start' }),
      expect.objectContaining({ type: 'text_message_content', delta: 'a' }),
    ])
  })

  it('非 chat 意图（H3 扩展后的形态）：INTENT_UNSUPPORTED 且不启动回合', async () => {
    analyzeIntentMock.mockReturnValue({ type: 'task' })
    turnMock.mockImplementation(makeTurn(['不该出现']))
    const service = makeService()

    const events = await collect(service.run(INPUT, new AbortController().signal))

    expect(events).toEqual([
      { type: 'error', code: 'INTENT_UNSUPPORTED', message: '该意图暂未支持' },
    ])
    expect(turnMock).not.toHaveBeenCalled()
  })

  it('modelId 与分段消息原样透传回合执行器', async () => {
    turnMock.mockImplementation(makeTurn(['好']))
    const service = makeService()
    const input: CreateChatStreamInput = {
      ...INPUT,
      modelId: 'deepseek-v4-pro',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '看图' },
            { type: 'image_url', imageUrl: { url: 'data:image/png;base64,aGk=' } },
          ],
        },
      ],
    }

    await collect(service.run(input, new AbortController().signal))

    expect(turnMock).toHaveBeenCalledWith(
      { messages: input.messages, modelId: 'deepseek-v4-pro' },
      expect.any(AbortSignal),
    )
  })
})
