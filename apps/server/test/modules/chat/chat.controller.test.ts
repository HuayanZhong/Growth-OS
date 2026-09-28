import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Response } from 'express'
import { Reflector } from '@nestjs/core'
import type { ChatStreamEvent, CreateChatStreamInput } from '@growth-os/types'
import { ChatController } from '../../../src/modules/chat/chat.controller.ts'
import { ChatStreamService } from '../../../src/modules/chat/chat-stream.service.ts'
import { IS_PUBLIC_KEY } from '../../../src/common/decorators/public.decorator.ts'
import { SKIP_TIMEOUT } from '../../../src/common/decorators/skip-timeout.decorator.ts'

/**
 * SSE 端点（raw res.write）：SSE 头与帧写出、断连（res close）→ AbortSignal
 * 透传、路由未豁免鉴权（无 @Public）且豁免超时（@SkipTimeout）。
 * 401/400 信封由全局 Guard/管道承担（supabase-jwt.guard.test 与
 * chat-stream.http.test 覆盖），此处不重复。
 */
const INPUT: CreateChatStreamInput = {
  agentSlug: 'xiaohuayan',
  messages: [{ role: 'user', content: '你好' }],
}

function makeRes(): Response {
  const res = Object.assign(new EventEmitter(), {
    writableEnded: false,
    status: vi.fn(),
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(function (this: { writableEnded: boolean }) {
      this.writableEnded = true
    }),
  })
  return res as unknown as Response
}

function makeService(
  gen: (input: CreateChatStreamInput, signal: AbortSignal) => AsyncIterable<ChatStreamEvent>,
) {
  const run = vi.fn(gen)
  return { service: { run } as unknown as ChatStreamService, run }
}

/** 让出宏任务边界：确保 stream 已挂起在生成器的下一次 pull 上 */
function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

describe('ChatController.stream', () => {
  let reflector: Reflector

  beforeEach(() => {
    vi.clearAllMocks()
    reflector = new Reflector()
  })

  it('路由未豁免鉴权（无 @Public）且豁免请求超时（@SkipTimeout）', () => {
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, ChatController)).toBeFalsy()
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, ChatController.prototype.stream)).toBeFalsy()
    expect(reflector.get<boolean>(SKIP_TIMEOUT, ChatController.prototype.stream)).toBe(true)
  })

  it('建立 SSE 头并按序写出事件帧，正常收尾', async () => {
    const events: ChatStreamEvent[] = [
      { type: 'run_started', runId: 'r1' },
      { type: 'text_message_start', messageId: 'm1' },
      { type: 'text_message_content', messageId: 'm1', delta: '你' },
      { type: 'text_message_end', messageId: 'm1' },
      { type: 'run_finished', runId: 'r1' },
    ]
    const { service, run } = makeService(async function* () {
      yield* events
    })
    const controller = new ChatController(service)
    const res = makeRes()

    await controller.stream(INPUT, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      expect.stringContaining('text/event-stream'),
    )
    const writes = vi.mocked(res.write).mock.calls.map((call) => call[0] as string)
    expect(writes).toHaveLength(events.length)
    expect(writes[0]).toBe(`data: ${JSON.stringify(events[0])}\n\n`)
    expect(writes.at(-1)).toBe(`data: ${JSON.stringify(events.at(-1))}\n\n`)
    expect(res.end).toHaveBeenCalled()
    expect(run).toHaveBeenCalledWith(INPUT, expect.any(AbortSignal))
  })

  it('客户端断连（res close）→ abort 透传并停止写出', async () => {
    let captured: AbortSignal | undefined
    const { service } = makeService((_input, signal) => {
      captured = signal
      return (async function* () {
        yield { type: 'text_message_content', messageId: 'm1', delta: 'a' }
        // 挂起在断连检测上：abort 前永远不产出下一帧
        await new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => resolve(), { once: true })
        })
        if (!signal.aborted) {
          yield { type: 'text_message_content', messageId: 'm1', delta: 'b' }
        }
      })()
    })
    const controller = new ChatController(service)
    const res = makeRes()

    const done = controller.stream(INPUT, res)
    await tick()
    res.emit('close')
    await done

    expect(captured).toBeDefined()
    expect(captured?.aborted).toBe(true)
    expect(vi.mocked(res.write).mock.calls).toHaveLength(1)
    expect(res.end).toHaveBeenCalled()
  })
})
