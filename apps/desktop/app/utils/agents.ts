// Agent 目录：数据模型落地前的前端静态登记（侧边栏树、Agent 开场页、TaskComposer 下拉共用），
// 落地后迁到 @growth-os/types / server 接口
export interface AgentEntry {
  slug: string
  name: string
  isDefault: boolean
}

export const AGENT_LIST: AgentEntry[] = [{ slug: 'xiaohuayan', name: '小花颜', isDefault: true }]

export function getAgent(slug: string): AgentEntry | undefined {
  return AGENT_LIST.find((agent) => agent.slug === slug)
}

export function getDefaultAgent(): AgentEntry {
  const found = AGENT_LIST.find((agent) => agent.isDefault)
  if (found) return found
  throw new Error('Agent 目录缺少默认 Agent')
}
