// Agent 目录常量（纯数据，无状态）：类型见 types/agents.ts，状态逻辑见 composables/useAgents.ts。
// 数据结构即未来 API payload 蓝本（见 openspec/changes/refactor-sfc-layering/design.md）
import type { AgentEntry } from '../types/agents'

// 表情形象候选（策展清单）：来源 public/emotion-ball/emotions.js，
// ID 编号即对外契约不可重排（该文件头注释声明）；剔除失落/疲惫/无奈等不宜作头像的情绪，
// 上游升级时人工核对此清单
export const AGENT_AVATAR_OPTIONS: ReadonlyArray<{ id: string; name: string }> = [
  { id: '02', name: '待机' },
  { id: '10', name: '开心' },
  { id: '11', name: '疑惑' },
  { id: '13', name: '惊讶' },
  { id: '14', name: '害羞' },
  { id: '16', name: '专注' },
  { id: '17', name: '慌张' },
  { id: '19', name: '满意' },
  { id: '20', name: '困惑' },
  { id: '21', name: '生气' },
]

export const DEFAULT_AVATAR_EMOTION = '02'

// 形象色板（预设 8 色）：小球身体颜色走引擎 create 的 color 参数（角色画布参数，
// 硬编码 hex 不属 UI 语义色范畴）；眼白由引擎在设色时自动切纯白。首位为默认米白（上游观感）。
export const AVATAR_COLOR_OPTIONS: ReadonlyArray<{ id: string; name: string }> = [
  { id: '#F6EFE4', name: '奶油' },
  { id: '#F8DFDC', name: '樱粉' },
  { id: '#FAE5C0', name: '杏黄' },
  { id: '#F6EFAF', name: '柠檬' },
  { id: '#CFE2F4', name: '雾蓝' },
  { id: '#E3DAF4', name: '藕紫' },
  { id: '#D9EBD5', name: '薄荷' },
  { id: '#F4CFC5', name: '珊瑚' },
]

export const DEFAULT_AVATAR_COLOR = AVATAR_COLOR_OPTIONS[0]?.id ?? '#F6EFE4'

// 内置 seed：默认 Agent「小花颜」，永不写盘、不可被本地数据覆盖
export const BUILT_IN_AGENTS: AgentEntry[] = [
  { slug: 'xiaohuayan', name: '小花颜', isDefault: true, emotion: DEFAULT_AVATAR_EMOTION },
]
