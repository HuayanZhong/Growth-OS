// Agent 目录状态逻辑（响应式单例）：目录以服务端为唯一数据源（server-agent-directory），
// 默认 Agent（seed 行）与自定义 Agent 均来自 GET /api/v1/agents，本模块不持久化任何本地数据。
// loaded/loadError 区分「未加载 / 加载失败（可重试）/ 加载完成但为空 / 就绪」；
// 会话失效（401）不进入错误态——已由 apiFetch 统一出口接管（登出 + 回登录页）。
// apiFetch 在 Nuxt 运行时可用（依赖 useRuntimeConfig/useSupabase）；unit 测试经 vi.mock 注入。
// 显式 import：unit 测试（node 环境）不经过 Nuxt 自动导入转换
import { ref } from 'vue'
import type { Agent, CreateAgentInput } from '@growth-os/types'
import { apiFetch, ApiError } from './useApi'
import { clearAgentChatSession } from './useAgentChat'

// 模块级单例：ssr: false（SPA）无水合顾虑，目录天然只活在客户端
const agents = ref<Agent[]>([])
const loaded = ref(false)
const loadError = ref<ApiError | null>(null)

// 拉取目录（登录会话就绪后调用）：非会话失效错误记入 loadError 供页面呈现可重试错误态，
// 网络 TypeError 归一为 NETWORK_ERROR（status 0 = 未收到 HTTP 响应）
export async function loadAgents(): Promise<void> {
  try {
    agents.value = await apiFetch<Agent[]>('/agents')
    loadError.value = null
  } catch (err) {
    // 401（含刷新失败）已由 apiFetch 出口本地登出并导航登录页，不呈现目录错误态
    loadError.value =
      err instanceof ApiError && err.status === 401
        ? null
        : err instanceof ApiError
          ? err
          : new ApiError(0, { code: 'NETWORK_ERROR', message: '网络异常，请稍后重试' })
    agents.value = []
  } finally {
    loaded.value = true
  }
}

// 创建自定义 Agent：POST 成功后追加目录并返回新条目（路由跳转由调用方负责）；错误向上传播
export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const agent = await apiFetch<Agent>('/agents', { method: 'POST', body: input })
  agents.value = [...agents.value, agent]
  return agent
}

// 删除自定义 Agent：按主键 id 调 DELETE，成功后从目录移除并丢弃其内存聊天会话；错误向上传播
export async function removeAgent(agent: Agent): Promise<void> {
  await apiFetch<{ deleted: true }>(`/agents/${agent.id}`, { method: 'DELETE' })
  agents.value = agents.value.filter((item) => item.id !== agent.id)
  clearAgentChatSession(agent.slug)
}

// 独立导出（非 useAgents 返回值）：在 computed/render 中调用内部读取 ref，仍具响应性
export function getAgent(slug: string): Agent | undefined {
  return agents.value.find((agent) => agent.slug === slug)
}

// 默认 Agent 可空：目录未加载或加载失败时为 undefined，调用点须做空态防御
export function getDefaultAgent(): Agent | undefined {
  return agents.value.find((agent) => agent.isDefault)
}

// 测试隔离专用：清空目录并重置加载标志（生产不调用；测试文件是 knip entry，导出不算死代码）
export function resetAgents(): void {
  agents.value = []
  loaded.value = false
  loadError.value = null
}

// 组件消费入口：agents/loaded/loadError 为响应式单例（模板/computed 直接迭代即可感知增删）
export function useAgents() {
  return { agents, loaded, loadError, loadAgents, createAgent, removeAgent }
}
