/**
 * LLM 能力适配器契约（迭代计划 2.1）。
 *
 * 抽象"对话补全"能力：实现方（DeepSeek/OpenAI 兼容网关等）注册为 NestJS
 * provider 供后端消费，或由 composable 工厂注入前端调用方；调用方只依赖
 * 本接口，不感知具体供应商。
 *
 * 消息词汇复用会话事件的 Message（四角色 + 工具调用字段）——"模型可见即已
 * 记录"的事件投影可直接作为 chat 入参，无需二次转换。
 */
import type { Message } from '../events/session.ts'

/** 模型可见消息：复用会话事件投影的 Message 类型 */
export type LLMMessage = Message

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
