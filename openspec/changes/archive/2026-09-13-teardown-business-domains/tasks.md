# Tasks — Teardown Business Domains

拆除顺序遵循 design D1（依赖倒序）：server 域 → DB 重基线 → 契约与投影 → 前端 → 生成管道与文档 → 全链验证。audit 与平台设施全程不动。

## 1. 拆除前保险

- [x] 1.1 导出 audit_logs 备份（psql `\copy (SELECT * FROM audit_logs) TO 'audit-logs-backup.csv' CSV HEADER`，连接串取自根 `.env` 的 `DATABASE_URL`；psql 不可用则明确记录跳过，数据默认可弃）。验证：备份文件存在于仓库外目录，或跳过原因已记录
- [x] 1.2 确认工作树干净、无未提交改动混入拆除。验证：`git status --porcelain` 输出为空（或仅含本变更已生成的 openspec 工件）

## 2. server 业务域删除（依赖倒序）

- [x] 2.1 删除 `src/modules/sessions/` 整目录与 `test/modules/sessions/`，从 `app.module.ts` 摘除 `SessionsModule`。验证：`pnpm --filter server typecheck` 绿
- [x] 2.2 删除 `src/infra/adapters/llm/`，从 `app.module.ts` 摘除 `LlmModule`。验证：`pnpm --filter server typecheck` 绿
- [x] 2.3 删除 `src/modules/agents/` 与 `test/modules/agents/`，摘除 `AgentsModule`。验证：`pnpm --filter server typecheck` 绿
- [x] 2.4 删除 `src/modules/{skills,projects,files}/` 与对应 `test/modules/{skills,projects,files}/`，摘除三个 Module 注册。验证：`pnpm --filter server typecheck` 绿且 `grep -r "modules/\(agents\|skills\|projects\|files\|sessions\)" apps/server/src` 无残留
- [x] 2.5 确认 `test/e2e-app.ts` 无需改动（只装配 auth/health/throttle）并运行 server 测试。验证：`pnpm --filter server test` 绿

## 3. 数据库重新基线化（design D2）

- [x] 3.1 删除 `src/infra/database/migrations/` 下全部 5 个迁移文件与 `.snapshot-postgres.json`（保留 `.gitkeep`）；用 psql 执行 `DROP TABLE IF EXISTS agents, skills, projects, session_records, session_events, audit_logs CASCADE`。验证：psql `\dt` 中 public schema 无任何业务表
- [x] 3.2 以剩余实体（仅 audit）生成全新 initial 迁移。验证：`pnpm mikro-orm:migration:create` 产出单个迁移文件且其 SQL 仅含 `audit_logs` 建表与索引
- [x] 3.3 应用迁移并核对同步状态。验证：`pnpm mikro-orm:migration:up` 成功，`pnpm mikro-orm:debug` 显示 schema 与实体一致、仅存在 `audit_logs`

## 4. 契约与投影层拆除（packages/types + shared）

- [x] 4.1 删除 `packages/types/src/api/{agents,skills,projects,files,sessions}.ts` 与 `packages/types/src/events/session.ts`；修剪 `packages/types/src/index.ts` 中对应导出（保留 `api/{http,error-envelope,health,audit}.ts`、`auth.ts`、`adapters/*`、`plugin.ts`、`utils/ipc-channels.ts`）。验证：`pnpm --filter @growth-os/types typecheck` 绿
- [x] 4.2 删除 `packages/shared/src/session-events.ts` 与 `packages/shared/src/events/`；修剪 `packages/shared/src/index.ts`（保留 env / normalize 导出）。验证：`pnpm --filter @growth-os/shared typecheck` 绿

## 5. desktop 拆除

- [x] 5.1 删除 `app/features/{agents,skills,projects,files,sessions}/` 与 `app/composables/useSessionReplay.ts`。验证：`grep -r "features/\(agents\|skills\|projects\|files\|sessions\)\|useSessionReplay" apps/desktop/app` 无残留
- [x] 5.2 删除 `app/components/chat/` 与 `app/components/sidebar/agent-menu.vue`；修改 `app/components/app-sidebar.vue` 摘除 `AgentMenu` 引用（纯导航侧栏）；将 `app/pages/dashboard/agents/index.vue` 改为与 projects 页同款空壳。验证：`grep -r "components/chat\|AgentMenu\|ChatMessageItem\|ChatInput" apps/desktop/app` 无残留
- [x] 5.3 删除对应测试与 fixtures：`test/nuxt/{agents-api,skills-api,projects-api,files-api,sessions-api,session-replay,chat-input,chat-suggestions,chat-message-item,use-agents}.test.ts`、`test/fixtures/session-recording.ts`；如 `default-layout.test.ts` 等因侧栏改动失败则同步修正。验证：`pnpm --filter desktop test` 绿
- [x] 5.4 desktop 编译完整性（契约层已删，此时跨包引用应全部闭合）。验证：`pnpm --filter desktop typecheck` 绿，且 `grep -rE "deriveMessages|sessionsApi|agentsApi|skillsApi|projectsApi|filesApi|useAgents" apps/desktop/app` 无残留

## 6. 生成管道与文档同步

- [x] 6.1 下线事件目录管道：删除 `scripts/generate-event-catalog.cjs`、`docs/event-catalog.md`、根 `package.json` 的 `generate:events` 脚本。验证：`grep -rn "generate:events\|event-catalog" package.json scripts/ docs/ openspec/` 无残留引用
- [x] 6.2 重新生成 OpenAPI 文档：`pnpm --filter server build` 后 `pnpm --filter server openapi:export`。验证：`apps/server/openapi.json` 的 paths 仅含 health / auth / audit-logs，无 `/agents` `/skills` `/projects` `/files` `/sessions` 前缀
- [x] 6.3 同步双语文档：`docs/architecture.md` 与 `docs/architecture.zh.md`（域描述与图）、`docs/server/database.md` 与 `docs/server/database.zh.md`（表与迁移）、`docs/desktop/architecture*.md`（如提及聊天组件/features）、`docs/guide-zh.md` 索引；双语对内容变更后按需 `pnpm verify:pairing --write <path>` 重录 hash。验证：`pnpm verify:docs` 绿

## 7. 全链验证与收尾

- [x] 7.1 清理孤儿依赖与导出（如 DeepSeek SDK 经 catalog 引入则移除；`pnpm-workspace.yaml` 与 `package.json` 同步）。验证：`pnpm hygiene` 绿
- [x] 7.2 三件套全绿。验证：`pnpm test` → `pnpm typecheck` → `pnpm lint` 依次通过
- [x] 7.3 结构门禁。验证：`pnpm verify`（invariants + docs + gates）绿
- [x] 7.4 按规格验收 platform-surface：启动后端后抽查——`GET /api/v1/agents` 返回 404 且响应体为 ApiErrorEnvelope；`GET /api/v1/health/readiness` 返回 200；携带有效 token 请求 `GET /api/v1/audit-logs` 返回 200 `{ data }`；`GET /docs-json` 无业务路径。验证：各请求输出符合 `specs/platform-surface/spec.md` 场景；可选 `pnpm --filter desktop verify:build` 冒烟
- [x] 7.5 交付 thin-pointer Agent Note（摘要 + 指向本变更目录），记录 audit 保留与 DB 重基线两个决策的落点。验证：Note 文件存在于 `.agents/notes/implemented/` 且 `pnpm verify:docs` 绿
