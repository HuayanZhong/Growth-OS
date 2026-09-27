// Agent 会话的前端纯函数（零运行时依赖）：与 types/chat.ts 同域，供 ChatMessageList 使用
/** 消息流日期分割线标签：月-日 两位数字（Coze 同型，如 07-27） */
export function formatChatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}
