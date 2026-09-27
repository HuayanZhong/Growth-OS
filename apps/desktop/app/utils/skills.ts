// 技能目录（静态占位）：技能页与 Agent 创建弹窗的扩展选择弹窗共用同一目录，
// 技能体系落地后迁移 @growth-os/types / server 接口（与 utils/models.ts 同模式）。
// tint 为技能图标块底色、icon 为线性图标路径（内容参数，同头像色板先例）。
// 类型见 types/skills.ts（目录包设计约定：类型在 types/，常量在 utils/）
import type { SkillEntry } from '../types/skills'

export const SKILL_LIST: SkillEntry[] = [
  {
    id: 'web-search',
    name: '联网搜索',
    description: '检索互联网实时信息，为回答补充最新依据',
    tint: '#CFE2F4',
    icon: 'M21 21l-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z',
  },
  {
    id: 'code-run',
    name: '代码运行',
    description: '在沙箱中执行代码片段，处理数据与计算任务',
    tint: '#D9EBD5',
    icon: 'm8 9-3 3 3 3M13 15l3-3-3-3M14 5l-4 14',
  },
  {
    id: 'knowledge',
    name: '知识库',
    description: '检索专属知识库内容，回答领域内问题',
    tint: '#E3DAF4',
    icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z',
  },
  {
    id: 'image-gen',
    name: '图像生成',
    description: '根据文字描述生成配图与插画',
    tint: '#FAE5C0',
    icon: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5ZM3 15l4-4 4 4M11 13l3-3 7 7M15 8h.01',
  },
]
