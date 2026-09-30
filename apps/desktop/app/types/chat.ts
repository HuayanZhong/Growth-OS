// Agent 会话消息的前端类型（纯类型文件，零运行时）：composables/useAgentChat.ts（状态）
// 与 components/ChatMessageList.vue（渲染）共用。仅前端局部，不进 packages/types 跨端契约。
export type ChatRole = 'user' | 'agent'

export interface ChatMessage {
  id: string
  role: ChatRole
  /** text：正式消息；typing：agent 侧打字指示占位；divider：模型切换分割线（会话元信息，不入请求历史） */
  kind: 'text' | 'typing' | 'divider'
  /** divider 时为分割线文案（如「已切换至 DeepSeek」） */
  text: string
  /** 消息携带的图片（data URL，仅用户消息；随内存会话存活，不持久化） */
  images?: string[]
  /** 创建时间戳（ms）；消息流顶部日期分割线的数据来源 */
  createdAt: number
}
