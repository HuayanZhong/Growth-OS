// 聊天消息：AI 与用户的消息项
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
