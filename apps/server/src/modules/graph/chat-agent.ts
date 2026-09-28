import { createDeepAgent } from 'deepagents'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { DeepAgent } from 'deepagents'

/**
 * 聊天 Agent 装配：deepagents 默认 harness + 空 tools，无 checkpointer、
 * 无模式注册表——一次调用一个独立回合，server 无状态。
 *
 * 注意：deepagents 自带规划/文件系统等内置工具（虚拟工作区内执行，
 * 对外无副作用）；工具事件当前不在对外契约中呈现。
 */
export function createChatAgent(model: BaseChatModel): DeepAgent {
  return createDeepAgent({ model, tools: [] })
}
