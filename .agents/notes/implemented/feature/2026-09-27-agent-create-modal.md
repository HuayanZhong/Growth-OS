# Agent Note: 创建 Agent 弹窗与 Agent 目录响应式化

Status: implemented

OpenSpec change：[add-agent-create-modal](../../../../openspec/changes/archive/2026-09-27-add-agent-create-modal/proposal.md)（完整动机、决策与备选方案在该 change 的 proposal/design，已归档）。

侧边栏 AGENTS 分组的 ⊕ 按钮打开「创建 Agent」弹窗（`apps/desktop/app/components/agents/CreateAgentModal.vue`）——布局 A：左侧动态小球实时预览 + 右侧名称/描述 + 底部表情网格 + 色板 + 扩展能力（仅技能一类：「技能 +N」chip + ＋ 打开扩展选择弹窗 [ExtensionPickerModal](../../../../apps/desktop/app/components/agents/ExtensionPickerModal.vue)——左分类栏仅技能 + 搜索 + 彩色图标卡片添加/移除 + 确定回填，对标 Coze 扩展弹窗；插件/MCP 后续接入同一弹窗；技能目录 `app/utils/skills.ts` `SKILL_LIST` 含描述与 tint，与技能页将来共用）。Agent 目录自静态数组迁移至 `apps/desktop/app/composables/useAgents.ts`（`utils/agents.ts` 已删除），创建走 `createAgent()`（slug = `agent-` + Web Crypto 8 位）并持久化到 localStorage 键 `growth-os-agents`（只写自定义 Agent，损坏静默回退）；侧边栏、TaskComposer 下拉、Agent 开场页的小球形象由目录 `emotion` + `color` 字段驱动。小球待机节奏经 `app/utils/emotionTempo.ts`（×0.5 重注册，同 ID 覆盖）调快，vendored 文件零改动。许可边界无扩大：Emotion Ball 视觉形象仍按 [emotion-ball Note](2026-09-27-emotion-ball-agent-avatar.md) 非商业使用。
