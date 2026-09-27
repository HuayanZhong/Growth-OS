// Agent 目录状态逻辑（响应式单例）：类型与目录常量见 utils/agents.ts（依赖方向 utils → composables 单向）。
// 持久化只写自定义 Agent（localStorage 键 growth-os-agents，非敏感数据不用 secureStorage），
// 内置 seed 永不写盘，避免上游演进被陈旧快照遮蔽；存储不可用/损坏时静默回退内置目录。
// Storage 以参数注入（默认全局 localStorage），node 单测可注入 fake。
// 显式 import：unit 测试（node 环境）不经过 Nuxt 自动导入转换；引 utils 用相对路径（同理可解析）
import { ref } from 'vue'
import type { AgentEntry, CreateAgentInput } from '../types/agents'
import { BUILT_IN_AGENTS } from '../utils/agents'

const AGENTS_STORAGE_KEY = 'growth-os-agents'

// 模块级单例：ssr: false（SPA）无水合顾虑，目录天然只活在客户端。
// 条目对象不做克隆——目录从不原地修改条目（只整体替换数组或追加新条目）
const agents = ref<AgentEntry[]>([...BUILT_IN_AGENTS])

function defaultStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}

function isAgentEntry(value: unknown): value is AgentEntry {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<AgentEntry>
  return (
    typeof item.slug === 'string' &&
    typeof item.name === 'string' &&
    typeof item.emotion === 'string' &&
    item.isDefault !== true
  )
}

// 载入本地自定义 Agent 并重置目录；存储损坏/结构不符/与内置 slug 冲突时静默回退。
// 可重复调用（生产仅在模块加载时执行一次，测试用于隔离重置）
export function initAgents(storage: Storage | null = defaultStorage()): void {
  let custom: AgentEntry[] = []
  if (storage) {
    try {
      const raw = storage.getItem(AGENTS_STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          custom = parsed
            .filter(isAgentEntry)
            .filter((item) => !BUILT_IN_AGENTS.some((builtIn) => builtIn.slug === item.slug))
        }
      }
    } catch {
      custom = []
    }
  }
  agents.value = [...BUILT_IN_AGENTS, ...custom]
}

// 只持久化自定义 Agent（isDefault 恒为 false 的条目）
function persist(storage: Storage | null): void {
  if (!storage) return
  const custom = agents.value.filter((agent) => !agent.isDefault)
  storage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(custom))
}

// slug：agent- + Web Crypto 随机 8 位（浏览器/node 原生，零依赖）；与现有 slug 冲突则重生成
function generateSlug(): string {
  for (;;) {
    const slug = `agent-${crypto.randomUUID().slice(0, 8)}`
    if (!agents.value.some((agent) => agent.slug === slug)) return slug
  }
}

// 创建自定义 Agent：追加目录并持久化，返回新条目（路由跳转由调用方负责）
export function createAgent(
  input: CreateAgentInput,
  storage: Storage | null = defaultStorage(),
): AgentEntry {
  const agent: AgentEntry = {
    slug: generateSlug(),
    name: input.name,
    isDefault: false,
    emotion: input.emotion,
    ...(input.color ? { color: input.color } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.skills?.length ? { skills: [...input.skills] } : {}),
  }
  agents.value = [...agents.value, agent]
  persist(storage)
  return agent
}

// 独立导出（非 useAgents 返回值）：在 computed/render 中调用内部读取 ref，仍具响应性
export function getAgent(slug: string): AgentEntry | undefined {
  return agents.value.find((agent) => agent.slug === slug)
}

export function getDefaultAgent(): AgentEntry {
  const found = agents.value.find((agent) => agent.isDefault)
  if (found) return found
  throw new Error('Agent 目录缺少默认 Agent')
}

// 组件消费入口：agents 为响应式单例（模板/computed 直接迭代即可感知创建）
export function useAgents() {
  return { agents, createAgent }
}

// 模块加载即初始化（SPA 仅客户端；node 单测环境无 localStorage 自动跳过）
initAgents()
