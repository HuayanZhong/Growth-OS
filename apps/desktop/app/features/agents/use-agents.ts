import type { Agent, CreateAgentInput } from '@growth-os/types'
import { agentsApi } from '~/features/agents/api'

/**
 * Agent 域状态与操作（迭代计划 2.6 前端 feature 化样板）。
 *
 * 域逻辑集中在 feature composable，页面/组件只做组装：
 * - agents / isLoading：列表状态，refresh 拉取；
 * - createAgent / renameAgent：写路径直接透传 ApiError，由调用方按 UI 需要提示
 *   （与 AuthService 的错误约定一致：composable 不吞错、不做 UI 反馈）。
 * 状态为每次调用独立创建（非模块单例），测试与多组件互不串扰。
 */
export function useAgents() {
  const agents = ref<Agent[]>([])
  const isLoading = ref(false)

  /** 拉取 Agent 列表；失败时抛出 ApiError，列表保持原值 */
  const refresh = async () => {
    isLoading.value = true
    try {
      agents.value = await agentsApi.list()
    } finally {
      isLoading.value = false
    }
  }

  /** 创建 Agent：成功后追加到列表尾部（骨架期后端 501，调用方捕获提示） */
  const createAgent = async (input: CreateAgentInput) => {
    const agent = await agentsApi.create(input)
    agents.value.push(agent)
    return agent
  }

  /** 重命名 Agent：成功后就地替换列表项，未命中时仅返回结果 */
  const renameAgent = async (id: string, name: string) => {
    const agent = await agentsApi.update(id, { name })
    const index = agents.value.findIndex((a) => a.id === id)
    if (index !== -1) {
      agents.value[index] = agent
    }
    return agent
  }

  return { agents, isLoading, refresh, createAgent, renameAgent }
}
