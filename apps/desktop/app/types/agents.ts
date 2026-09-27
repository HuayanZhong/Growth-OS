// Agent 目录的前端类型（纯类型文件，零运行时）：由 utils/agents.ts（目录常量）与
// composables/useAgents.ts（状态逻辑）共用。数据结构即未来 API payload 蓝本；
// 仅前端局部，不进 packages/types 跨端契约。
// 目录包设计约定：每域一个文件（agents/skills/...），消费方按文件显式 import type，不建 index barrel
export interface AgentEntry {
  slug: string
  name: string
  isDefault: boolean
  emotion: string
  color?: string
  description?: string
  skills?: string[]
}

export interface CreateAgentInput {
  name: string
  emotion: string
  color?: string
  description?: string
  skills?: string[]
}
