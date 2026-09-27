# Design: refactor-sfc-layering

## Context

现状违例与约束（动机见 [proposal.md](proposal.md)；先例决策见 Agent Note `2026-09-27-agent-create-modal.md`）：

- `app/composables/useAgents.ts` 一文件混装类型（`AgentEntry`/`CreateAgentInput`）、目录常量（`AGENT_AVATAR_OPTIONS`/`AVATAR_COLOR_OPTIONS`）、持久化与 slug 逻辑、状态单例。
- `app/components/agents/ExtensionPickerModal.vue` 内嵌 `SKILL_ICONS` 图标路径常量表；`CreateAgentModal.vue` 内嵌完整表单状态机（5 状态 + 校验 + 回填 + submit 导航）。
- 用户硬约束：**Nuxt 项目不瞎建目录**——不发明 `app/constants/`、`app/types/` 之类的非约定顶层目录；只允许 Nuxt 已有约定（`utils/`、`composables/`、`components/`）。
- 项目无 Pinia；`app/utils/` 是 Nuxt 约定目录（自动导入纯代码），承载类型 + 目录常量 + 纯函数是既有实践（`utils/models.ts` 先例）。

## Goals / Non-Goals

**Goals:**

- 三层落位：`utils/`（类型 + 目录常量 + 纯函数）→ `composables/`（状态与业务逻辑）→ `components/`（视图组装 + 事件接线）。
- 本 change 引入的全部违例文件归位；行为零变化。
- SFC 分层纪律写入根 `AGENTS.md` frontend 层契约，防回归。

**Non-Goals:**

- 既有存量组件（TaskComposer/app-sidebar/auth 组件/ThemeToggle）的回溯重构——后续新改动顺手治理（用户选定范围）。
- 视图令牌（`menuClass` 等样式类字符串）外移——与模板共生的视图令牌允许留在 SFC。
- packages/types 跨端契约变动——前端局部类型不进共享包。
- 引入 Pinia 或新增目录。

## Decisions

1. **类型独立 `app/types/`（用户指定目录），常量留 `utils/`。** `app/types/agents.ts`（`AgentEntry`/`CreateAgentInput`）与 `app/types/skills.ts`（`SkillEntry`）为每域一个的纯类型文件（零运行时，显式 `import type`，不建 index barrel——防 knip unused-export 噪音）；`app/utils/agents.ts`/`utils/skills.ts` 保留目录常量与纯函数（`utils/agents.ts` 重建承接 OPTIONS 表与 `BUILT_IN_AGENTS`），依赖方向 types（最底）→ utils → composables 单向。备选：建 `app/constants/`（用户否决非约定目录堆砌）；类型进 `packages/types`（前端局部视图类型不属跨端契约，弃）；utils 内类型常量同居（用户审查后要求分离，弃）。
2. **`SKILL_ICONS` 内联进 `SKILL_LIST` 的 `icon` 字段。** 图标路径是技能目录的视觉元数据，与 `tint` 同性质（数据一体），比独立 map 更内聚；`ExtensionPickerModal.vue` 用 `skill.icon` 渲染，`SKILL_ICONS` 常量表删除。备选：`utils/skills.ts` 独立导出 map（多一个查找点，弃）。
3. **表单状态机抽 `composables/useCreateAgentForm.ts`。** 迁出内容：5 个表单状态（name/description/selectedEmotion/selectedColor/selectedSkills）、`canCreate`、`reset()`、`confirmSkills()`、`submit()`（调 `createAgent` + `navigateTo`，业务流完整可测）。SFC 只剩 `open()/close()` 弹窗开关与事件接线。备选：状态留组件只抽 submit（逻辑仍埋视图里，不达目标，弃）。
4. **`useAgents.ts` 保留为纯状态逻辑。** 迁出类型与常量后剩：模块级单例 `ref`、`initAgents`/`persist`/`generateSlug`/`isAgentEntry`、`createAgent`/`getAgent`/`getDefaultAgent`/`useAgents`、`AGENTS_STORAGE_KEY`。函数签名与导出名全部不变，消费点只改导入路径。
5. **纪律成文位置：根 `AGENTS.md` 的 frontend 层契约。** 新增 SFC 分层条目（utils=类型+目录常量+纯函数 / composables=状态与业务逻辑 / components=视图组装+事件接线；SFC 内允许视图令牌与文案）。备选：`.trae/rules/frontend/**` 新文件（AGENTS.md 已是 frontend 层契约的家，避免文件碎片，弃）。
6. **行为零变化的验证锚点。** 现有测试断言目标全部不变（仅导入路径调整）；unit vitest typecheck（7.x 轮补的门禁）将自动检查新文件的类型正确性。

## Risks / Trade-offs

- [Nuxt 自动导入在目录重组后失灵] → composable/useAgents 导出名不变（`useAgents`/`createAgent` 等仍从 composables 目录自动导出）；`utils` 导出同理；改造后立即跑全量测试 + typecheck 验证。
- [表单逻辑抽离后弹窗重置时序回归] → `reset()` 语义保持「打开即重置」，由现有 create-agent-modal 测试（重置/回填/取消丢弃用例）守门。
- [AGENTS.md 预算] → frontend 层契约新增条目控制在 ~3 行内；改后立即跑 `pnpm verify:docs`。
- [与未归档 change add-agent-create-modal 的工件交叉] → 本次重构不改其行为；其 Note 在归档时链接不受影响（文件仅内部重组）。

## Migration Plan

顺序执行：utils 归位（类型+常量）→ composables 瘦身 → SFC 视图化 → 消费点导入更新 → 测试路径微调 → AGENTS.md 成文 → 全量验证。回滚：revert 即恢复单文件形态。

## Open Questions

（无）
