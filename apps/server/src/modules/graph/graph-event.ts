/**
 * 编排事件（graph 域自有极简类型）。
 *
 * 该类型是 graph 对外唯一的流式词汇：langgraph/deepagents 的原生事件
 * 结构不出本目录，由 chat 模块映射为跨端 ChatStreamEvent 契约。
 * 当前事件仅文本增量与回合结束；工具调用、中断恢复事件在此扩展。
 */
export type GraphEvent = { type: 'text_delta'; delta: string } | { type: 'turn_end' }

/** 回合输入：模型可见消息历史（与跨端请求契约同构，经 chat 层映射而来） */
export interface ChatTurnInput {
  messages: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>
}
