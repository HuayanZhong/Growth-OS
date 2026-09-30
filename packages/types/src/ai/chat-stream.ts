/**
 * AI 流式聊天契约（ai-chat-stream-mvp）。
 *
 * 数据面：POST /chat/stream 以 SSE 推送 ChatStreamEvent（`data: <json>\n\n` 单事件帧）。
 * 请求侧消息 content 为纯字符串或分段数组（图片为 base64 data URL，仅随请求内存传递，
 * 服务端按模型视觉能力透传或降级为文本占位）。
 * 事件命名对齐 AG-UI 生命周期语义；当前发出 6 个事件，预留事件名只进契约
 * 不发出，前端对未知 type 丢弃不报错——这是契约加法演进的兼容机制。
 * 控制面错误（鉴权/校验）在流建立前走 ApiErrorEnvelope，不走本契约。
 */
import { z } from 'zod'

// ---- 请求契约（控制面：流建立前的唯一入参）----

const IMAGE_DATA_URL_PATTERN = /^data:image\/(jpeg|png|gif|webp);base64,/
/** 单张图片 data URL 字符上限（前端压缩产物 ≤1MB → base64 约 1.37M 字符，留裕量） */
const IMAGE_URL_MAX_LENGTH = 2_000_000
/** 单条消息图片分段上限（与前端附件上限一致） */
const MAX_IMAGE_PARTS = 4

const chatContentPartSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().min(1).max(32000) }),
  z.object({
    type: z.literal('image_url'),
    imageUrl: z.object({ url: z.string().max(IMAGE_URL_MAX_LENGTH).regex(IMAGE_DATA_URL_PATTERN) }),
  }),
])

/** 消息内容分段：文本段或图片段（图片为 base64 data URL，仅随请求内存传递） */
export type ChatMessageContentPart = z.infer<typeof chatContentPartSchema>

const chatContentPartsSchema = z
  .array(chatContentPartSchema)
  .min(1)
  .max(16)
  .superRefine((parts, ctx) => {
    const imageCount = parts.filter((part) => part.type === 'image_url').length
    if (imageCount > MAX_IMAGE_PARTS) {
      ctx.addIssue({
        code: 'custom',
        message: `单条消息最多 ${MAX_IMAGE_PARTS} 张图片`,
        path: [],
      })
    }
  })

/** 消息历史条目：role 限 user/assistant（system 提示由服务端内部管理，客户端不可传）；
 * content 为纯字符串或分段数组，图片分段仅允许出现在 user 消息（assistant 恒为纯字符串） */
export const chatStreamMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.union([z.string().min(1).max(32000), chatContentPartsSchema]),
  })
  .superRefine((message, ctx) => {
    if (message.role !== 'user' && typeof message.content !== 'string') {
      ctx.addIssue({
        code: 'custom',
        message: 'assistant 消息 content 仅支持纯字符串',
        path: ['content'],
      })
    }
  })
export type ChatStreamMessage = z.infer<typeof chatStreamMessageSchema>

export const createChatStreamSchema = z.object({
  /** Agent 标识（目录 slug）；仅作路由与日志语义，不参与模型选择 */
  agentSlug: z.string().min(1).max(100),
  /** 显式模型标识；缺省（Auto）由服务端按请求内容路由（含图选视觉模型，纯文本走默认模型）。
   * 注册表归属由服务端请求 schema 校验（未知标识在流建立前拒绝） */
  modelId: z.string().min(1).max(100).optional(),
  /** 多轮上下文：完整历史由客户端携带（server 无会话状态），末条为本次用户输入 */
  messages: z.array(chatStreamMessageSchema).min(1).max(200),
})
export type CreateChatStreamInput = z.infer<typeof createChatStreamSchema>

// ---- 事件契约（数据面：SSE 帧负载）----
// 单事件 schema 为模块内构件（对外只暴露 chatStreamEventSchema 判别联合）

const runStartedEventSchema = z.object({
  type: z.literal('run_started'),
  runId: z.string(),
})

const textMessageStartEventSchema = z.object({
  type: z.literal('text_message_start'),
  messageId: z.string(),
})

const textMessageContentEventSchema = z.object({
  type: z.literal('text_message_content'),
  messageId: z.string(),
  /** 增量文本：顺序拼接即为完整回复 */
  delta: z.string(),
})

const textMessageEndEventSchema = z.object({
  type: z.literal('text_message_end'),
  messageId: z.string(),
})

const runFinishedEventSchema = z.object({
  type: z.literal('run_finished'),
  runId: z.string(),
  /** token 用量：当前不产生，字段留位 */
  usage: z
    .object({
      promptTokens: z.number().int().nonnegative(),
      completionTokens: z.number().int().nonnegative(),
    })
    .optional(),
})

const chatStreamErrorEventSchema = z.object({
  type: z.literal('error'),
  /** 机器可读错误码；5xx 类事件不携带内部细节 */
  code: z.string(),
  message: z.string(),
})

export const chatStreamEventSchema = z.discriminatedUnion('type', [
  runStartedEventSchema,
  textMessageStartEventSchema,
  textMessageContentEventSchema,
  textMessageEndEventSchema,
  runFinishedEventSchema,
  chatStreamErrorEventSchema,
])
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>

/** 预留事件名（当前不发出，进契约供前端穷举兼容）：工具调用与意图澄清/升级 */
export const CHAT_STREAM_RESERVED_EVENT_TYPES = [
  'tool_call_start',
  'tool_call_args',
  'tool_call_end',
  'intent_clarification',
  'intent_reroute',
] as const
export type ChatStreamReservedEventType = (typeof CHAT_STREAM_RESERVED_EVENT_TYPES)[number]

// ---- SSE 帧编解码（单事件帧，SSE 本身保序故无 seq）----

/** 编码一帧：`data: <单事件 JSON>\n\n` */
export function encodeChatStreamFrame(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/** 解析单帧负载（`data: ` 后的 JSON 文本）；非法或未知事件返回 undefined（调用方丢弃） */
export function parseChatStreamEvent(json: string): ChatStreamEvent | undefined {
  try {
    const parsed = chatStreamEventSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}
