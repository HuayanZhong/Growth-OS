# Tasks: refactor-sfc-layering

## 1. utils 归位（类型 + 目录常量）

- [x] 1.1 重建 `apps/desktop/app/utils/agents.ts`：迁入 `AgentEntry`/`CreateAgentInput` 类型与 `AGENT_AVATAR_OPTIONS`/`AVATAR_COLOR_OPTIONS`/`DEFAULT_AVATAR_EMOTION`/`DEFAULT_AVATAR_COLOR`/`BUILT_IN_AGENTS` 常量（从 `composables/useAgents.ts` 拆出，内容原样）；`useAgents.ts` 改从 `utils/agents` 导入，仅保留状态逻辑（单例/initAgents/persist/generateSlug/isAgentEntry/createAgent/getAgent/getDefaultAgent/useAgents，导出名与签名不变）。验证：`pnpm --filter desktop test`（unit vitest typecheck 覆盖新文件）→ `pnpm --filter desktop typecheck`
- [x] 1.2 `apps/desktop/app/utils/skills.ts`：`SKILL_LIST` 每项内联 `icon` 线性图标路径字段（值取自 `ExtensionPickerModal.vue` 的 `SKILL_ICONS`）。验证：`pnpm --filter desktop exec vitest run test/unit` 全绿 → `pnpm --filter desktop typecheck`

## 2. SFC 视图化

- [x] 2.1 `ExtensionPickerModal.vue`：删除组件内 `SKILL_ICONS` 常量表，改读 `skill.icon`；其余不动。验证：`pnpm --filter desktop exec vitest run test/nuxt/create-agent-modal.test.ts` 全绿
- [x] 2.2 新建 `apps/desktop/app/composables/useCreateAgentForm.ts`：迁出 `CreateAgentModal.vue` 表单状态机（name/description/selectedEmotion/selectedColor/selectedSkills、canCreate、reset()、confirmSkills()、submit() 含 createAgent+navigateTo）；`CreateAgentModal.vue` 收敛为视图组装（open/close 弹窗开关 + 事件接线，script 不再含表单状态与业务流）。验证：`pnpm --filter desktop exec vitest run test/nuxt/create-agent-modal.test.ts` 全绿（断言目标不变）
- [x] 2.3 消费点导入路径更新：`app-sidebar.vue`/`TaskComposer.vue`/`pages/dashboard/tasks/new.vue`/`pages/dashboard/agents/[id].vue` 中类型与常量导入改自 `utils/agents`（`useAgents` 调用不变）。验证：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint` 全绿

## 3. 纪律成文与收尾

- [x] 3.1 根 `AGENTS.md` frontend 层契约补 SFC 分层纪律（utils=类型+目录常量+纯函数 / composables=状态与业务逻辑 / components=视图组装+事件接线；≤3 行）。验证：`pnpm verify:docs` 通过
- [x] 3.2 全量收尾：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint` → `pnpm verify` 全绿；实机 `pnpm dev` 走一遍创建 Agent 全流程（行为零变化确认）；交付 thin pointer Agent Note（`.agents/notes/`，指向本 change）
- [x] 3.3 实机走查发现的抽离回归修正：`submit()` 抽离时丢了原 SFC 的 `close()`（弹窗挂载于持久布局，路由切换不卸载 → 弹窗残留新页面）——关闭职责回宿主 `onSubmit()`（close → form.submit），SFC 仍无业务逻辑。验证：实机创建链路复验（创建 → 弹窗关闭 → 跳转新开场页 → 侧栏即时出现）+ `pnpm --filter desktop test` → typecheck → lint 全绿

## 8. 增量：类型独立 app/types/ 目录（用户审查指定，2026-09-27）

- [x] 8.1 类型迁移：新建 `app/types/agents.ts`（AgentEntry/CreateAgentInput）与 `app/types/skills.ts`（SkillEntry）——每域一个纯类型文件，零运行时，显式 `import type`，不建 index barrel；`utils/agents.ts`（保留目录常量 + seed）与 `utils/skills.ts` 改 `import type`，composables/test 导入路径同步。验证：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint` → `pnpm verify` 全绿
