# Proposal: refactor-sfc-layering

## Why

用户审查发现：前端组件把逻辑、类型、常量、样式全部塞进 `<script setup>`（甚至 composable 一文件混装类型 + 常量 + 持久化 + 状态操作），无法独立维护与复用——「骨架设计很好，但打开 vue 文件怎么改」。趁 change `add-agent-create-modal` 刚落地、违例集中且新鲜，立分层纪律并重构本 change 引入的全部违例。

## What Changes

- **目录纪律（零新增顶层目录，纯 Nuxt 约定）**：`app/utils/` 承载类型与目录常量（纯数据/纯函数）、`app/composables/` 承载状态与业务逻辑、`app/components/` 只剩视图组装与事件接线（SFC script 以行为单位收敛，不堆常量与状态机）。
- `app/utils/agents.ts`（重建）：迁入 `AgentEntry` / `CreateAgentInput` 类型与 `AGENT_AVATAR_OPTIONS` / `AVATAR_COLOR_OPTIONS` / `BUILT_IN_AGENTS` 常量（从 `composables/useAgents.ts` 拆出）。
- `app/utils/skills.ts`：`SKILL_LIST` 每项内联 `icon` 线性图标路径（从 `ExtensionPickerModal.vue` 的 `SKILL_ICONS` 组件内常量迁出）。
- `app/composables/useAgents.ts`：仅保留状态逻辑（单例、initAgents/createAgent/getAgent/getDefaultAgent、持久化、slug 生成、类型守卫），类型与常量改从 `utils/agents.ts` 导入。
- 新增 `app/composables/useCreateAgentForm.ts`：从 `CreateAgentModal.vue` 抽出表单状态机（5 个表单状态、校验、技能确认回填、submit 创建+导航）；SFC 只剩视图组装与事件接线。
- 全部消费点导入路径同步更新（app-sidebar / TaskComposer / ExtensionPickerModal / CreateAgentModal / [id].vue / tasks/new.vue）。
- **行为零变化**：对外交互、持久化键、数据结构、测试断言目标全部不变（测试本身随导入路径微调）。
- **Harness assets**：触碰根 `AGENTS.md`——在 frontend 层契约补充 SFC 分层纪律（防回归），走 docs/AGENTS.md 流程。

## Capabilities

### New Capabilities

（无——纯重构，外部行为零变化）

### Modified Capabilities

（无——`.openspec.yaml` 已设 `skip_specs: true`）

## Impact

- **apps/desktop**（唯一受影响层）：`app/utils/agents.ts`（重建）、`app/utils/skills.ts`（+icon）、`app/composables/useAgents.ts`（瘦身）、`app/composables/useCreateAgentForm.ts`（新增）、`app/components/agents/CreateAgentModal.vue` 与 `ExtensionPickerModal.vue`（视图化）、消费点导入路径更新、`AGENTS.md`（SFC 分层纪律成文）。
- **apps/server / packages/**：无改动。
- **测试**：`test/unit/use-agents.test.ts` 与 emotion-tempo 等导入路径微调；断言目标不变。
- **风险边界**：类型守卫、持久化键、slug 生成算法原样迁移；`pnpm test`（含 unit vitest typecheck）→ typecheck → lint → `pnpm verify` 全绿为完成线。
