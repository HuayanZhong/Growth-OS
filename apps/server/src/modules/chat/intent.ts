import type { CreateChatStreamInput } from '@growth-os/types'

/**
 * 意图分析：当前恒直通 chat。
 *
 * 本函数是意图路由的唯一实现位——扩展 ChatIntent 联合（QA / task /
 * meta / ambiguous）后在 chat-stream.service 按类型分发；澄清与升级
 * 事件（intent_clarification / intent_reroute）已在契约中命名。
 */
export type ChatIntent = { type: 'chat' }

export function analyzeIntent(_input: CreateChatStreamInput): ChatIntent {
  return { type: 'chat' }
}
