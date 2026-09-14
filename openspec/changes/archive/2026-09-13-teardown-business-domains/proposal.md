# Teardown Business Domains

## Why

当前 5 个业务域（agents / skills / projects / files / sessions）及其挂靠件（LLM 适配器、会话事件投影）是在用户未参与设计的情况下生成的脚手架，其领域模型（事件日志、fork、id 引用聚合、审计埋点）已被预设进表结构和契约。用户决定按自己的设计重建这些模块（路线 A：先全拆、再逐域重建），拆得越干净，重建时被旧设计约束越少。

## What Changes

**移除（BREAKING）**：

- `apps/server`：删除 5 个业务模块（`agents` / `skills` / `projects` / `files` / `sessions`）与 LLM 适配器（`infra/adapters/llm`，唯一消费方是 sessions 的 turn 管线）；`app.module.ts` 同步摘除注册
- 数据库：删除 4 个迁移（`session_events` / `session_records` / `agents_skills_projects` / `list_order_indexes`），迁移历史整体重新基线化，drop 5 张业务表；audit_logs 表按"保留 audit"决策处理（见 design.md）
- `packages/types`：删除 5 个域契约（`api/agents.ts` / `api/skills.ts` / `api/projects.ts` / `api/files.ts` / `api/sessions.ts`）与事件词汇表（`events/session.ts`），`index.ts` barrel 同步
- `packages/shared`：删除会话事件部分（`session-events.ts` 的 `deriveMessages`、`events/bus.ts` 的事件总线）
- `apps/desktop`：删除 5 个域的 feature client（`features/{agents,skills,projects,files,sessions}/`）、聊天组件链（`components/chat/*`）、`agent-menu.vue`、`useSessionReplay.ts`；`pages/dashboard/agents` 打回空壳页
- 测试：删除上述全部域的 server 单测与 desktop 测试及 fixtures
- 脚本与文档：删除 `scripts/generate-event-catalog.cjs` 及其生成物；`openapi.json` 重新生成；`docs/` 中涉及域的描述同步

**保留（不动）**：

- `audit` 模块 + `audit_logs` 表 + `GET /audit-logs`（其 4 个写侧调用方随域文件一并消失，audit 成为独立运转的"记录 + 查询"底盘；后续重建各域时由用户逐域决定是否接回 `auditService.record()`）
- `auth` / `health` / `throttle`、全局设施（信封 / 异常 / 校验 / 限流 / OpenAPI 助手）、`packages/types` 的 `adapters/*` 平台契约、桌面端登录链路 / 布局 / 其余空壳页

**不在本变更范围**：AI 域的重建设计。重建按用户指导逐域立项，每个域单独走 OpenSpec 变更（契约先行：types 契约 → server → 前端 → 测试）。

## Capabilities

### New Capabilities

- `platform-surface`: 业务域拆除后的服务端对外契约——仅保留 auth / health / audit / 限流；5 组业务路径（`/agents` `/skills` `/projects` `/files` `/sessions`）不再存在（404）；audit 查询端点保持可用

### Modified Capabilities

（无——现有 5 个 spec（agent-harness / auth-oauth-login / e2e-testing / frontend-motion / test-coverage）均不覆盖业务域，无需求级变更）

## Impact

- **apps/server**：`src/modules/` 6 个模块目录、`src/infra/adapters/llm/`、`src/infra/database/migrations/` 4 个文件 + 快照、`app.module.ts`、`test/modules/` 对应单测、`openapi.json`（重新生成后仅剩 auth/health/audit）
- **packages/types**：`src/api/` 5 个文件、`src/events/session.ts`、`src/index.ts`
- **packages/shared**：`src/session-events.ts`、`src/events/`、`src/index.ts`
- **apps/desktop**：`app/features/` 5 个目录、`app/components/chat/`、`app/components/sidebar/agent-menu.vue`、`app/composables/useSessionReplay.ts`、`app/pages/dashboard/agents/index.vue`、`test/nuxt/` 对应测试与 `test/fixtures/session-recording.ts`
- **scripts**：`generate-event-catalog.cjs` + 生成文档
- **docs**：`docs/architecture.md`（域描述）、`docs/server/database.md`（表/迁移）、`docs/event-catalog*`（如生成物入库）
- **harness 资产**：不修改 `.trae/` 规则与 `AGENTS.md`；按仓库文档规则随变更交付 thin-pointer Agent Note（`.agents/notes/`）
- **依赖**：无新增；knip 可能报告删除后的孤儿依赖（如 LLM SDK），在 tasks 中清理
