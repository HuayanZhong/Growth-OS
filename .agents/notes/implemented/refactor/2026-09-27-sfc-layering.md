# Agent Note: SFC 分层治理（refactor-sfc-layering）

Status: implemented

OpenSpec change：[refactor-sfc-layering](../../../../openspec/changes/archive/2026-09-27-refactor-sfc-layering/proposal.md)（skip_specs 纯重构，行为零变化；完整决策与备选在该 change 的 proposal/design，已归档）。

用户审查发现组件把逻辑/类型/常量/样式塞进 `<script setup>` 无法维护。分层落位（纯 Nuxt 约定 + 用户指定的 `app/types/`）：`app/types/` 持每域纯类型文件（agents/skills，零运行时、显式 `import type`、不建 barrel）；`app/utils/` 持目录常量与纯函数（`utils/agents.ts` 承接 Agent 目录 OPTIONS 表与 seed；`utils/skills.ts` 的 SKILL_LIST 内联 icon 线性图标路径，吸收组件内常量表）；`app/composables/` 持状态与业务逻辑（useAgents 瘦身为纯状态逻辑；新增 useCreateAgentForm 表单状态机，reactive 包裹返回供模板解包）；两个弹窗 SFC 收敛为视图组装 + 事件接线。分层层契约已写入 [apps/desktop/AGENTS.md](../../../apps/desktop/AGENTS.md)（SFC layering stays strict）防回归；存量组件（TaskComposer/auth 等）后续新改动时顺手治理。
