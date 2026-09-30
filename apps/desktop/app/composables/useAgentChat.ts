// Agent 会话状态（响应式模块级单例）：按 slug 内存缓存（应用会话内保留，重启即失，
// 有意不持久化——内存缓存即多轮上下文来源，每次请求全量携带，server 严格无状态）。
// sendMessage 发起真实流式请求（POST /chat/stream，SSE）：打字占位接收
// ChatStreamEvent 增量渲染为打字机文本；stopGenerating 中止（AbortController →
// 服务端 AbortSignal 透传终止模型调用）；错误经 onError 回调呈现（UI 归组件）。
// pending 机制承接新任务页交接：stagePending 暂存首条消息，agent 页 consumePending 消费。
// 显式 import：unit 测试（node 环境）不经过 Nuxt 自动导入转换；引类型用相对路径
import { reactive } from 'vue'
import type { ChatStreamEvent } from '@growth-os/types'
import { apiStream } from './useApi'
import { createSseEventParser } from '../utils/sse'
import type { ChatMessage } from '../types/chat'

interface AgentChatSession {
  messages: ChatMessage[]
  /** 会话当前生效模型（'auto' 或注册表 id）；分割线去重依据，首次发送时记基线 */
  currentModelId?: string
}

// 模块级单例：reactive Map（Vue 3 对 Map 的 get/set/has 具备响应性），ssr: false（SPA）无水合顾虑
const sessions = reactive(new Map<string, AgentChatSession>())

// 跨页交接的暂存首条消息（同一时刻至多一条：新任务页发送即跳转，先到先得）
let pending: { slug: string; text: string; images: string[]; modelId?: string } | null = null

// 生成中的请求：按 slug 一个 AbortController（停止按钮 / 生成中再发 → 中止旧流）。
// reactive Map：isGenerating 的 has 调用可被组件 computed 追踪（停止按钮显隐）
const inFlight = reactive(new Map<string, AbortController>())

// 请求历史上限（与契约 createChatStreamSchema 的 messages 上限一致）
const MAX_HISTORY_MESSAGES = 200

// 消息 id：chat- 会话内自增即可（仅前端内存，无需全局唯一）
let idSeq = 0
function nextId(): string {
  idSeq += 1
  return `chat-${idSeq}`
}

// 会话存在性 = 消息流非空（hero/chat 双态判定的唯一依据，不引入额外状态）
export function hasSession(slug: string): boolean {
  return (sessions.get(slug)?.messages.length ?? 0) > 0
}

// 读取会话（只读；不存在返回 undefined，由调用方兜底空数组）
export function getSession(slug: string): AgentChatSession | undefined {
  return sessions.get(slug)
}

// 当前 slug 是否有生成中的流（停止按钮的显隐依据）
export function isGenerating(slug: string): boolean {
  return inFlight.has(slug)
}

// 停止生成：中止流式请求；已收到的部分文本保留（气泡不再增长）
export function stopGenerating(slug: string): void {
  inFlight.get(slug)?.abort()
}

// 模型切换分割线：chat 态（有会话）且模型实际变化时插入居中分割线并更新会话
// 生效模型；重复选择相同模型不插线；无会话（hero 态）不产生。分割线为会话
// 元信息，不入请求历史（toHistory 仅取 kind === "text"）。
export function insertModelDivider(slug: string, modelId: string, label: string): void {
  const session = sessions.get(slug)
  if (!session || session.messages.length === 0) return
  if (session.currentModelId === modelId) return
  session.currentModelId = modelId
  session.messages.push({
    id: nextId(),
    role: 'agent',
    kind: 'divider',
    text: `已切换至 ${label}`,
    createdAt: Date.now(),
  })
}

// 发送：追加用户消息（可携带图片 data URL 与显式 modelId）并启动流式回复；agent 侧
// 先呈现 typing 占位，首个增量到达后原位转为文本并随增量增长。文本与图片任一非空
// 即可发送。生成中再次发送 → 被忽略（消息顺序保护，终止走 stopGenerating）。
// onError：错误呈现回调（toast 归组件，composable 不依赖 Nuxt UI 单例）；
// modelId：手动档显式模型（Auto 缺省，由服务端按请求内容路由）。
export function sendMessage(
  slug: string,
  text: string,
  images: string[] = [],
  onError?: (message: string) => void,
  modelId?: string,
): void {
  const trimmed = text.trim()
  const attachedImages = images.filter(Boolean)
  if (!trimmed && attachedImages.length === 0) return
  // 生成中忽略新发送：回复按序完成，消息顺序不乱（终止走 stopGenerating）
  if (inFlight.has(slug)) return
  let session = sessions.get(slug)
  if (!session) {
    // 首次发送记模型基线（手动档 id 或 'auto'），分割线去重以此为基准
    session = { messages: [], currentModelId: modelId ?? 'auto' }
    sessions.set(slug, session)
  }
  if (session.messages.at(-1)?.kind === 'typing') session.messages.pop()
  session.messages.push({
    id: nextId(),
    role: 'user',
    kind: 'text',
    text: trimmed,
    ...(attachedImages.length > 0 ? { images: attachedImages } : {}),
    createdAt: Date.now(),
  })
  // 占位气泡必须是 reactive 对象：流式泵逐 delta 原位改写它，若推入数组的
  // 是原始对象则不触发重渲染，表现为"等全部返回才一次性显示"
  const placeholder: ChatMessage = reactive({
    id: nextId(),
    role: 'agent',
    kind: 'typing',
    text: '',
    createdAt: Date.now(),
  })
  session.messages.push(placeholder)
  void runStream(slug, session, placeholder, onError, modelId)
}

// 流式泵：请求 → 逐块解码 → 帧解析 → 增量渲染。唯一事件汇聚点的消费端。
async function runStream(
  slug: string,
  session: AgentChatSession,
  placeholder: ChatMessage,
  onError?: (message: string) => void,
  modelId?: string,
): Promise<void> {
  const controller = new AbortController()
  inFlight.set(slug, controller)
  try {
    const response = await apiStream('/chat/stream', {
      // exactOptionalPropertyTypes：Auto 不携带 modelId 键（服务端按内容路由）
      body: {
        agentSlug: slug,
        messages: toHistory(session.messages),
        ...(modelId !== undefined ? { modelId } : {}),
      },
      signal: controller.signal,
    })
    if (!response.body) throw new Error('SSE 响应无响应体')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const parser = createSseEventParser({ onInvalid: (reason) => console.warn(`[sse] ${reason}`) })

    const apply = (event: ChatStreamEvent): void => {
      switch (event.type) {
        case 'text_message_content':
          // 首个增量：typing 占位原位转为文本（对象身份不变，消息流不重排）
          if (placeholder.kind === 'typing') placeholder.kind = 'text'
          placeholder.text += event.delta
          break
        case 'error':
          onError?.(event.message)
          break
        // run_started / *_end / run_finished：渲染无动作（空回复占位由 finally 清理）
      }
    }

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      for (const event of parser.push(decoder.decode(value, { stream: true }))) apply(event)
    }
    for (const event of parser.flush()) apply(event)
  } catch (error) {
    // 中断是正常路径（停止按钮/断连），静默；其余错误交由回调呈现
    if (!controller.signal.aborted) {
      onError?.(error instanceof Error ? error.message : '回复生成失败，请稍后重试')
    }
  } finally {
    inFlight.delete(slug)
    // 空回复（无增量到达）时移除 typing 占位；身份校验确保只清自己那条
    // （生成中再发场景下 last 已是新占位）
    if (session.messages.at(-1) === placeholder && placeholder.kind === 'typing') {
      session.messages.pop()
    }
  }
}

// 内存会话 → 请求历史：typing 占位不入历史，取最近 N 条（契约上限内）。
// 带图消息的 content 为分段数组（文本段 + 图片段；无文本时仅图片段），
// 图片 data URL 即契约 image_url 段的 url，同源零转换。
function toHistory(messages: ChatMessage[]): {
  role: 'user' | 'assistant'
  content:
    | string
    | Array<{ type: 'text'; text: string } | { type: 'image_url'; imageUrl: { url: string } }>
}[] {
  return messages
    .filter((message) => message.kind === 'text')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: toHistoryContent(message),
    }))
}

function toHistoryContent(
  message: ChatMessage,
):
  | string
  | Array<{ type: 'text'; text: string } | { type: 'image_url'; imageUrl: { url: string } }> {
  if (!message.images?.length) return message.text
  const parts: Array<
    { type: 'text'; text: string } | { type: 'image_url'; imageUrl: { url: string } }
  > = []
  if (message.text) parts.push({ type: 'text', text: message.text })
  for (const url of message.images) parts.push({ type: 'image_url', imageUrl: { url } })
  return parts
}

// 新任务页交接：暂存首条消息（发送即跳转，暂存先于路由）
export function stagePending(
  slug: string,
  text: string,
  images: string[] = [],
  modelId?: string,
): void {
  pending = { slug, text, images, ...(modelId !== undefined ? { modelId } : {}) }
}

// agent 页消费：命中当前 slug 返回消息内容；未命中（用户中途改道其他 agent）丢弃，
// 防止陈旧草稿在后续访问时意外落进无关会话
export function consumePending(
  slug: string,
): { text: string; images: string[]; modelId?: string } | null {
  const current = pending
  pending = null
  return current && current.slug === slug
    ? {
        text: current.text,
        images: current.images,
        ...(current.modelId !== undefined ? { modelId: current.modelId } : {}),
      }
    : null
}

// 删除 Agent 时清理其会话（removeAgent 调用；进行中的流一并中止）
export function clearAgentChatSession(slug: string): void {
  inFlight.get(slug)?.abort()
  sessions.delete(slug)
}

// 测试隔离专用：清空全部会话与 pending（生产不调用；测试文件是 knip entry，导出不算死代码）
export function resetAgentChat(): void {
  for (const controller of inFlight.values()) controller.abort()
  inFlight.clear()
  sessions.clear()
  pending = null
}

// 组件消费入口
export function useAgentChat() {
  return {
    hasSession,
    getSession,
    sendMessage,
    stagePending,
    consumePending,
    isGenerating,
    stopGenerating,
    insertModelDivider,
  }
}
