import { describe, expect, it, vi } from 'vitest'
import { createSseEventParser } from '../../app/utils/sse'
import type { ChatStreamEvent } from '@growth-os/types'

/**
 * SSE 事件帧解析（node 环境纯函数）：多帧、跨块边界、未知事件丢弃、
 * 坏帧跳过、\r\n 归一、flush 残余处理。
 */
const frame = (event: ChatStreamEvent): string => `data: ${JSON.stringify(event)}\n\n`

describe('createSseEventParser', () => {
  it('多帧一次喂入按序解析', () => {
    const parser = createSseEventParser()
    const text =
      frame({ type: 'run_started', runId: 'r1' }) +
      frame({ type: 'text_message_start', messageId: 'm1' }) +
      frame({ type: 'text_message_content', messageId: 'm1', delta: '你好' })
    const events = parser.push(text)
    expect(events.map((e) => e.type)).toEqual([
      'run_started',
      'text_message_start',
      'text_message_content',
    ])
  })

  it('帧跨块边界（任意切割点）不丢不重', () => {
    const parser = createSseEventParser()
    const text = frame({ type: 'text_message_content', messageId: 'm1', delta: 'hello' })
    const events = [
      ...parser.push(text.slice(0, 7)),
      ...parser.push(text.slice(7, 20)),
      ...parser.push(text.slice(20)),
    ]
    expect(events).toEqual([{ type: 'text_message_content', messageId: 'm1', delta: 'hello' }])
  })

  it('未知事件类型丢弃并回调，不影响后续帧', () => {
    const onInvalid = vi.fn()
    const parser = createSseEventParser({ onInvalid })
    const text =
      `data: {"type":"intent_clarification","question":"?"}\n\n` +
      frame({ type: 'run_finished', runId: 'r1' })
    const events = parser.push(text)
    expect(events).toEqual([{ type: 'run_finished', runId: 'r1' }])
    expect(onInvalid).toHaveBeenCalledWith(
      'unknown-or-invalid-event:intent_clarification',
      expect.any(String),
    )
  })

  it('坏 JSON 与非法负载跳过不中断', () => {
    const onInvalid = vi.fn()
    const parser = createSseEventParser({ onInvalid })
    const text =
      'data: {broken json\n\n' +
      'data: {"type":"error"}\n\n' + // 缺 message：schema 不通过
      frame({ type: 'run_started', runId: 'r2' })
    const events = parser.push(text)
    expect(events).toEqual([{ type: 'run_started', runId: 'r2' }])
    expect(onInvalid).toHaveBeenCalledTimes(2)
  })

  it('\\r\\n 归一为 \\n', () => {
    const parser = createSseEventParser()
    const events = parser.push(
      `data: ${JSON.stringify({ type: 'run_started', runId: 'r3' })}\r\n\r\n`,
    )
    expect(events).toEqual([{ type: 'run_started', runId: 'r3' }])
  })

  it('无 data 行的块（注释/空行）忽略', () => {
    const parser = createSseEventParser()
    const events = parser.push(': keep-alive\n\n\n')
    expect(events).toEqual([])
  })

  it('flush 处理未以空行结尾的最后一帧；空残余不产出', () => {
    const onInvalid = vi.fn()
    const parser = createSseEventParser({ onInvalid })
    // 无结尾空行：push 不产出，flush 兜底产出
    const pushed = parser.push(`data: ${JSON.stringify({ type: 'run_finished', runId: 'r4' })}`)
    expect(pushed).toEqual([])
    expect(parser.flush()).toEqual([{ type: 'run_finished', runId: 'r4' }])
    // 半帧残余：flush 报非法
    parser.push('data: {"type":"run_st')
    expect(parser.flush()).toEqual([])
    expect(onInvalid).toHaveBeenCalledWith('incomplete-frame', expect.any(String))
  })
})
