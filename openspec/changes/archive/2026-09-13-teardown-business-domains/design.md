# Design — Teardown Business Domains

## Context

拆除范围与动机见 [proposal.md](proposal.md)，拆除后的行为契约见 [specs/platform-surface/spec.md](specs/platform-surface/spec.md)。当前耦合事实（探索结论）：

- server 依赖方向：sessions → {audit, agents, llm}；agents/skills/projects → audit；files 独立；audit 独立（仅被引用）
- 数据库：5 张业务表由 4 个迁移创建（`agents_skills_projects` 一个文件含三表；`list_order_indexes` 横跨四表），`audit_logs` 由独立迁移 `Migration20260907141021_audit_logs` 创建
- 跨包消费：`packages/shared` 的 `deriveMessages` 与事件总线完全建立在 `packages/types` 的 `events/session.ts` 词汇表上；`scripts/generate-event-catalog.cjs` 消费同一词汇表生成 `docs/event-catalog.md`
- 前端消费：`app-sidebar.vue` 引用 `AgentMenu`；`pages/dashboard/agents` 引用 chat 组件链；`features/{skills,projects,files}` 的 client 无 UI 消费方（仅各自测试引用）
- 本区域既有决策记录：[2026-09-06-cookbook-llm-adapter](../../../../.agents/notes/implemented/feature/2026-09-06-cookbook-llm-adapter.md)、[2026-09-07-session-event-log-persistence](../../../../.agents/notes/implemented/feature/2026-09-07-session-event-log-persistence.md)、[2026-09-07-session-fork-semantics](../../../../.agents/notes/implemented/feature/2026-09-07-session-fork-semantics.md)、[2026-09-07-turn-pipeline](../../../../.agents/notes/implemented/feature/2026-09-07-turn-pipeline.md)、[2026-09-07-event-catalog](../../../../.agents/notes/implemented/feature/2026-09-07-event-catalog.md)、[2026-09-07-audit-log](../../../../.agents/notes/implemented/feature/2026-09-07-audit-log.md)、[2026-09-03-adapter-interfaces](../../../../.agents/notes/implemented/feature/2026-09-03-adapter-interfaces.md)、[2026-09-13-openapi-completeness](../../../../.agents/notes/implemented/feature/2026-09-13-openapi-completeness.md)——拆除使这些决策所描述的实现下线，本变更的 Agent Note 将指向本变更作为其现状替代

## Goals / Non-Goals

**Goals:**

- 一次性移除 5 个业务域的完整链（server → DB → 契约 → 投影/总线 → 前端 → 测试 → 生成脚本），无残留引用
- 迁移历史重新基线化，迁移链与剩余实体（audit）严格一致
- auth / health / throttle / audit 模块零改动；全局设施仅按 spec 需要新增兜底路由（见 D8）
- 全链验证门全绿：`pnpm test` / `typecheck` / `lint` / `hygiene` / `verify`

**Non-Goals:**

- 不设计任何重建方案（逐域重建由用户指导，单独立项）
- 不新增/改写 `.trae/` 规则语义与 `openspec/specs/` 既有能力；仅修复指向已删除文件的陈旧引用（hooks.md、validation.md、timeout.md、compression.md、orm.md）
- 不清理与业务域无关的既有死代码

## Decisions

**D1 拆除顺序：依赖倒序，单次原子落地。**
先删消费方（sessions → llm → agents → skills/projects/files），`app.module.ts` 与各 barrel（`packages/types/src/index.ts`、`packages/shared/src/index.ts`）随引用消失同步修剪；audit 与平台设施不动。
备选"按域分批提交"被否：跨域耦合（sessions→agents、四域→audit、词汇表→shared/脚本）会造成中间态不可编译、验证门无法运行。

**D2 数据库重新基线化（含 audit_logs 一并重建）。**
删除全部 5 个迁移文件与 `.snapshot-postgres.json`，drop 全部业务表**含 audit_logs**，随后以剩余实体（仅 audit）生成全新 initial 迁移并 `migration:up`。
备选"保留 `Migration20260907141021_audit_logs`、手工修剪快照"被否：快照是全 schema 状态文件，无法从存活 DB 可靠再生成，保留部分迁移必然产生快照漂移。
audit 历史数据随重建丢失：开发库、骨架期数据，路线 A 已确认全拆；tasks 中含一次性导出保险步骤（`COPY (SELECT * FROM audit_logs) TO STDOUT` 存本地文件），不需保留可跳过。

**D3 audit 保持原样。**
模块、实体、迁移（重建后的 initial）、端点、单测全部不动。其写侧调用方随域文件消失，audit 代码零修改；重建各域时由用户逐域决定接回 `auditService.record()`。

**D4 前端删除边界。**
删除 `features/{agents,skills,projects,files,sessions}/`、`components/chat/`、`components/sidebar/agent-menu.vue`、`composables/useSessionReplay.ts` 及对应测试；`app-sidebar.vue` 摘除 `AgentMenu` 引用（改为纯导航侧栏）；`pages/dashboard/agents/index.vue` 打回与 skills/files/projects 同款空壳页（保留路由占位）。`dashboard/{skills,files,projects}` 空壳页本就无 API 依赖，原样保留。

**D5 事件目录管道整体下线。**
删除 `scripts/generate-event-catalog.cjs`、生成的 `docs/event-catalog.md`、根 `package.json` 的 `generate:events` 脚本。已确认 `doc-budgets.manifest.json` 无该文件条目；删除后跑 `pnpm verify:docs` 确认无悬空链接。

**D6 LLM 适配器全拆，契约层保留。**
删除 `src/infra/adapters/llm/`（deepseek 实现 + token + module）；`packages/types/src/adapters/llm.ts` 是平台级契约（[2026-09-03-adapter-interfaces](../../../../.agents/notes/implemented/feature/2026-09-03-adapter-interfaces.md)），不依赖业务域，保留。删除后由 `pnpm hygiene` 报告并清理孤儿依赖（如 DeepSeek SDK，若经 catalog 引入）。

**D7 OpenAPI 文档重生成。**
删除完成后按既有管道重建：`nest build` → `pnpm --filter server openapi:export`（脚本从 dist 加载，规避 tsx DI 缺陷，见 [2026-09-13-openapi-completeness](../../../../.agents/notes/implemented/feature/2026-09-13-openapi-completeness.md)），产物仅含 platform-surface 描述的端点。

**D8 兜底 404 路由（实施中发现的规格缺口）。**
验收发现：URI versioning + global prefix 下，未匹配路由落入 Express 默认 404（HTML），绕过 AllExceptionsFilter，违反 platform-surface 的"响应体 SHALL 符合 ApiErrorEnvelope"场景。新增 `src/common/not-found/not-found.module.ts`（`@Controller('{*path}')` 兜底 + `@ApiExcludeEndpoint` 防止污染文档），在 AppModule imports 中最后注册。备选"main.ts 挂 express 兜底中间件"被否：中间件抛出的异常同样不经过异常过滤层。实施落点见 tasks 7.4 的 404 验收。

## Risks / Trade-offs

- [迁移重基线后 `mikro-orm:debug` 报漂移] → initial 迁移由实体定义生成而非手写；执行 `pnpm mikro-orm:debug` + 空 DB 重放验证
- [双语文档对失同步] → `docs/architecture.md` / `docs/server/database.md` 的中文镜像同批修改，`pnpm verify:docs` 的双语 hash 检查兜底（必要时 `pnpm verify:pairing --write` 重录）
- [desktop 残留引用导致编译失败] → 已知引用点（app-sidebar、agents 页、chat 组件链）在 D4 中明确；删除后立即 `pnpm --filter desktop typecheck`，并以 grep 兜底扫描 `@growth-os/types` 中已删导出的引用
- [knip 报告孤儿导出/依赖] → 作为收尾任务运行 `pnpm hygiene` 并按报告清理，属于预期信号而非阻塞
- [audit 历史丢失] → 导出保险步骤（D2）；若用户要求保留历史，apply 前提出即可改走备份恢复

## Migration Plan

本地开发库，无生产部署。单变更原子落地：代码删除 + DB 重基线在同一变更内完成。回滚 = `git revert` 恢复代码 + 用 D2 导出的 audit 备份（如有）恢复数据；迁移历史回滚后以 revert 后的迁移文件重放。

## Open Questions

无。audit 历史数据默认不保留（导出保险已覆盖反悔路径）。
