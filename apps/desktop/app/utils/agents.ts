// Agent 形象选项常量（纯数据，无状态）：状态逻辑见 composables/useAgents.ts。
// 目录数据本身已迁移服务端（server-agent-directory），此处只保留创建表单的策展选项。

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
// 硬编码 hex 不属 UI 语义色范畴）；眼白由引擎在设色时自动切纯白。
// 中饱和粉彩档（亮度 ~87%、饱和 ~65%）：保证色相间彼此可辨，避免高亮浅色在色板上发白发灰
export const AVATAR_COLOR_OPTIONS: ReadonlyArray<{ id: string; name: string }> = [
  { id: '#F2E4C0', name: '奶油' },
  { id: '#F6C6CD', name: '樱粉' },
  { id: '#F5CE95', name: '杏黄' },
  { id: '#E9E382', name: '柠檬' },
  { id: '#A9CDEF', name: '雾蓝' },
  { id: '#C7B6EA', name: '藕紫' },
  { id: '#ABDABA', name: '薄荷' },
  { id: '#F2A58F', name: '珊瑚' },
]

export const DEFAULT_AVATAR_COLOR = AVATAR_COLOR_OPTIONS[0]?.id ?? '#F2E4C0'
