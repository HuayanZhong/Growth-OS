// Agent 会话状态（响应式模块级单例）：按 slug 内存缓存（应用会话内保留，重启即失，
// 有意不持久化——任务执行后端接入时替换数据源，接口不变）。
// sendMessage 追加用户消息 + agent 侧 typing 占位（纯前端静态占位，零网络请求）。
// pending 机制承接新任务页交接：stagePending 暂存首条消息，agent 页 consumePending 消费。
// 显式 import：unit 测试（node 环境）不经过 Nuxt 自动导入转换；引类型用相对路径
import { reactive } from 'vue'
import type { ChatMessage } from '../types/chat'

interface AgentChatSession {
  messages: ChatMessage[]
}

// 模块级单例：reactive Map（Vue 3 对 Map 的 get/set/has 具备响应性），ssr: false（SPA）无水合顾虑
const sessions = reactive(new Map<string, AgentChatSession>())

// 跨页交接的暂存首条消息（同一时刻至多一条：新任务页发送即跳转，先到先得）
let pending: { slug: string; text: string } | null = null

// 消息 id：agent- 会话内自增即可（仅前端内存，无需全局唯一）
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

// 发送：追加用户消息；agent 侧补 typing 占位。旧占位（静态态永不 resolve）随新发送移除，
// 保证打字指示始终只有一条且位于末尾——可观察行为不变：发送后存在打字指示
export function sendMessage(slug: string, text: string): void {
  const trimmed = text.trim()
  if (!trimmed) return
  let session = sessions.get(slug)
  if (!session) {
    session = { messages: [] }
    sessions.set(slug, session)
  }
  if (session.messages.at(-1)?.kind === 'typing') session.messages.pop()
  session.messages.push({
    id: nextId(),
    role: 'user',
    kind: 'text',
    text: trimmed,
    createdAt: Date.now(),
  })
  session.messages.push({
    id: nextId(),
    role: 'agent',
    kind: 'typing',
    text: '',
    createdAt: Date.now(),
  })
}

// 新任务页交接：暂存首条消息（发送即跳转，暂存先于路由）
export function stagePending(slug: string, text: string): void {
  pending = { slug, text }
}

// agent 页消费：命中当前 slug 返回文本；未命中（用户中途改道其他 agent）丢弃，
// 防止陈旧草稿在后续访问时意外落进无关会话
export function consumePending(slug: string): string | null {
  const current = pending
  pending = null
  return current && current.slug === slug ? current.text : null
}

// 删除 Agent 时清理其会话（removeAgent 调用；会话仅内存态，随目录删除一并丢弃）
export function clearAgentChatSession(slug: string): void {
  sessions.delete(slug)
}

// 测试隔离专用：清空全部会话与 pending（生产不调用；测试文件是 knip entry，导出不算死代码）
export function resetAgentChat(): void {
  sessions.clear()
  pending = null
}

// 组件消费入口
export function useAgentChat() {
  return { hasSession, getSession, sendMessage, stagePending, consumePending }
}
