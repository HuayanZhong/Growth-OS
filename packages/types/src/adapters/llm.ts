/**
 * LLM 能力适配器契约（迭代计划 2.1）。
 *
 * 抽象"对话补全"能力：实现方（DeepSeek/OpenAI 兼容网关等）注册为 NestJS
 * provider 供后端消费，或由 composable 工厂注入前端调用方；调用方只依赖
 * 本接口，不感知具体供应商。
 */

/** 模型可见消息角色 */
export type LLMMessageRole = 'system' | 'user' | 'assistant' | 'tool'

/** 工具调用引用：assistant 消息携带 / tool 结果回指 */
export interface LLMToolCallRef {
  /** 调用唯一 id，tool 结果通过 toolCallId 回指 */
  id: string
  /** 工具名 */
  name: string
  /** 序列化的调用参数（JSON 字符串） */
  arguments: string
}

/** 模型可见消息 */
export interface LLMMessage {
  role: LLMMessageRole
  content: string
  /** role='tool' 时：本条结果对应的调用 id */
  toolCallId?: string
  /** role='assistant' 时：本条消息携带的工具调用 */
  toolCalls?: LLMToolCallRef[]
}

export interface LLMChatParams {
  /** 模型标识（如 deepseek-chat），实现方据此路由到具体供应商/部署 */
  model: string
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  /** 取消信号：聊天 UI 的停止按钮经 AbortController 传入 */
  signal?: AbortSignal
}

/** token 用量（计费与上下文预算依据） */
export interface LLMUsage {
  promptTokens: number
  completionTokens: number
}

export interface LLMChatResponse {
  content: string
  usage: LLMUsage
}

/** 流式增量：content 为本次增量文本，顺序拼接即为完整回复 */
export interface LLMChunk {
  content: string
}

export interface LLMAdapter {
  /** 非流式对话补全 */
  chat(params: LLMChatParams): Promise<LLMChatResponse>
  /**
   * 可选流式对话补全；未实现时调用方回退到 chat。
   * 工具调用的流式增量暂不在契约内（实现方可用 chat 表达带工具调用的轮次）。
   */
  stream?(params: LLMChatParams): AsyncGenerator<LLMChunk, void, unknown>
}
