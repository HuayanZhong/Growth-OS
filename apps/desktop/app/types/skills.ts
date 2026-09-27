// 技能目录的前端类型（纯类型文件，零运行时）：由 utils/skills.ts（目录常量）消费。
// 目录包设计约定同 types/agents.ts：每域一个文件，消费方按文件显式 import type，不建 index barrel
export interface SkillEntry {
  id: string
  name: string
  description: string
  tint: string
  icon: string
}
