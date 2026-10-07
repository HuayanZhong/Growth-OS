import { describe, it, expect } from 'vitest'
import {
  chatStreamEventSchema,
  chatStreamMessageSchema,
  createChatStreamSchema,
  encodeChatStreamFrame,
  parseChatStreamEvent,
  CHAT_STREAM_RESERVED_EVENT_TYPES,
} from '../../src/ai/chat-stream.ts'
import type { ChatStreamEvent } from '../../src/ai/chat-stream.ts'

const IMAGE_URL = 'data:image/png;base64,aGVsbG8='

describe('createChatStreamSchema', () => {
  it('纯文本消息通过', () => {
    const input = { agentSlug: 'demo', messages: [{ role: 'user', content: '你好' }] }

    expect(createChatStreamSchema.parse(input)).toEqual(input)
  })

  it('modelId 缺省合法（Auto 路由），显式传入也合法', () => {
    const base = { agentSlug: 'demo', messages: [{ role: 'user', content: 'hi' }] }

    expect(createChatStreamSchema.parse(base)).toEqual(base)
    expect(createChatStreamSchema.parse({ ...base, modelId: 'gpt-x' })).toEqual({
      ...base,
      modelId: 'gpt-x',
    })
  })

  it('user 消息允许文本+图片分段数组', () => {
    const input = {
      agentSlug: 'demo',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '看图' },
            { type: 'image_url', imageUrl: { url: IMAGE_URL } },
          ],
        },
      ],
    }

    expect(createChatStreamSchema.parse(input)).toEqual(input)
  })

  it('assistant 消息 content 仅支持纯字符串', () => {
    const valid = {
      agentSlug: 'demo',
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ],
    }

    expect(createChatStreamSchema.parse(valid)).toEqual(valid)

    const invalid = {
      agentSlug: 'demo',
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: [{ type: 'text', text: 'hello' }] },
      ],
    }

    expect(() => createChatStreamSchema.parse(invalid)).toThrow(/纯字符串/)
  })

  it('图片段超 4 张失败', () => {
    const parts = Array.from({ length: 5 }, () => ({
      type: 'image_url',
      imageUrl: { url: IMAGE_URL },
    }))

    expect(() =>
      createChatStreamSchema.parse({
        agentSlug: 'demo',
        messages: [{ role: 'user', content: parts }],
      }),
    ).toThrow(/最多 4 张图片/)
  })

  it('非法图片 data URL 失败', () => {
    const input = {
      agentSlug: 'demo',
      messages: [
        { role: 'user', content: [{ type: 'image_url', imageUrl: { url: 'https://x/a.png' } }] },
      ],
    }

    expect(() => createChatStreamSchema.parse(input)).toThrow()
  })

  it('messages 为空或 role 非法失败', () => {
    expect(() => createChatStreamSchema.parse({ agentSlug: 'demo', messages: [] })).toThrow()
    expect(() =>
      createChatStreamSchema.parse({
        agentSlug: 'demo',
        messages: [{ role: 'system', content: 'x' }],
      }),
    ).toThrow()
  })
})

describe('chatStreamMessageSchema', () => {
  it('文本段 text 不可为空', () => {
    expect(() =>
      chatStreamMessageSchema.parse({ role: 'user', content: [{ type: 'text', text: '' }] }),
    ).toThrow()
  })
})

describe('chatStreamEventSchema', () => {
  it('六个生命周期事件均可解析', () => {
    const events: ChatStreamEvent[] = [
      { type: 'run_started', runId: 'r1' },
      { type: 'text_message_start', messageId: 'm1' },
      { type: 'text_message_content', messageId: 'm1', delta: '你' },
      { type: 'text_message_end', messageId: 'm1' },
      { type: 'run_finished', runId: 'r1' },
      { type: 'error', code: 'MODEL_UNAVAILABLE', message: '模型不可用' },
    ]

    for (const event of events) {
      expect(chatStreamEventSchema.parse(event)).toEqual(event)
    }
  })

  it('run_finished 的 usage 可缺省、字段留位', () => {
    expect(chatStreamEventSchema.parse({ type: 'run_finished', runId: 'r1' })).toEqual({
      type: 'run_finished',
      runId: 'r1',
    })
  })

  it('未知 type 拒绝（前端对未知事件丢弃不报错的前提是契约拒绝）', () => {
    expect(() => chatStreamEventSchema.parse({ type: 'tool_call_start' })).toThrow()
  })

  it('预留事件名只进契约', () => {
    expect(CHAT_STREAM_RESERVED_EVENT_TYPES).toContain('tool_call_start')
    expect(CHAT_STREAM_RESERVED_EVENT_TYPES).toContain('intent_reroute')
  })
})

describe('SSE 帧编解码', () => {
  it('encode 输出单事件帧格式 data: <json>\\n\\n', () => {
    const frame = encodeChatStreamFrame({ type: 'run_started', runId: 'r1' })

    expect(frame).toBe('data: {"type":"run_started","runId":"r1"}\n\n')
  })

  it('encode → parse 往返还原事件', () => {
    const event: ChatStreamEvent = { type: 'text_message_content', messageId: 'm1', delta: 'hi' }

    expect(parseChatStreamEvent(encodeChatStreamFrame(event).slice('data: '.length))).toEqual(event)
  })

  it('parse 非法 JSON 返回 undefined（调用方丢弃）', () => {
    expect(parseChatStreamEvent('{not-json')).toBeUndefined()
  })

  it('parse 未知事件返回 undefined', () => {
    expect(parseChatStreamEvent(JSON.stringify({ type: 'unknown_event' }))).toBeUndefined()
  })
})
