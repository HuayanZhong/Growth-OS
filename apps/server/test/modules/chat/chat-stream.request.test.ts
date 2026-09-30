import { describe, expect, it } from 'vitest'
import { chatStreamRequestSchema } from '../../../src/modules/chat/chat-stream.request.ts'

/**
 * 服务端请求 schema：契约形态（content 分段、image 段限 user、data URL
 * 形态、图片数上限）+ modelId 注册表归属。校验失败即流建立前的
 * ApiErrorEnvelope 拒绝（管道到信封的映射由既有 pipe/filter 承担）。
 */

const VALID_BASE = {
  agentSlug: 'xiaohuayan',
  messages: [{ role: 'user', content: '你好' }],
} as const

describe('chatStreamRequestSchema', () => {
  it('纯文本请求通过（Auto：无 modelId）', () => {
    const parsed = chatStreamRequestSchema.safeParse(VALID_BASE)
    expect(parsed.success).toBe(true)
  })

  it('注册表内的 modelId 通过', () => {
    const parsed = chatStreamRequestSchema.safeParse({
      ...VALID_BASE,
      modelId: 'deepseek-v4-pro',
    })
    expect(parsed.success).toBe(true)
  })

  it('未注册的 modelId 被拒绝', () => {
    const parsed = chatStreamRequestSchema.safeParse({ ...VALID_BASE, modelId: 'gpt-99' })
    expect(parsed.success).toBe(false)
  })

  it('user 消息携带 text + image 分段通过', () => {
    const parsed = chatStreamRequestSchema.safeParse({
      ...VALID_BASE,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '看图' },
            { type: 'image_url', imageUrl: { url: 'data:image/png;base64,aGk=' } },
          ],
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it('assistant 消息携带分段被拒绝（图片分段仅限 user 消息）', () => {
    const parsed = chatStreamRequestSchema.safeParse({
      ...VALID_BASE,
      messages: [
        { role: 'user', content: '你好' },
        {
          role: 'assistant',
          content: [{ type: 'text', text: '分段也不行' }],
        },
      ],
    })
    expect(parsed.success).toBe(false)
  })

  it('image_url 非 data URL 形态被拒绝', () => {
    const parsed = chatStreamRequestSchema.safeParse({
      ...VALID_BASE,
      messages: [
        {
          role: 'user',
          content: [{ type: 'image_url', imageUrl: { url: 'https://example.com/a.png' } }],
        },
      ],
    })
    expect(parsed.success).toBe(false)
  })

  it('单条消息图片分段超过 4 张被拒绝', () => {
    const image = { type: 'image_url', imageUrl: { url: 'data:image/png;base64,aGk=' } }
    const parsed = chatStreamRequestSchema.safeParse({
      ...VALID_BASE,
      messages: [{ role: 'user', content: [image, image, image, image, image] }],
    })
    expect(parsed.success).toBe(false)
  })

  it('仅图片无文本分段通过', () => {
    const parsed = chatStreamRequestSchema.safeParse({
      ...VALID_BASE,
      messages: [
        {
          role: 'user',
          content: [{ type: 'image_url', imageUrl: { url: 'data:image/jpeg;base64,aGk=' } }],
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })
})
