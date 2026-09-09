# Tasks: trustworthy-coverage

## 1. 修正 coverage 统计口径

- [x] 1.1 `packages/ui`、`apps/desktop`、`packages/desktop-core`、`packages/shared` 的 vitest.config.ts 加统一排除片段（`**/*.d.ts`、`**/*.{css,svg,woff,woff2,png,jpg}`、`**/.gitkeep`、`**/index.ts`），desktop-core 另加 `src/types.ts`，并注释排除口径；验证：`pnpm --filter @growth-os/ui test:coverage`、`pnpm --filter desktop test:coverage`、`pnpm --filter @growth-os/desktop-core test:coverage`、`pnpm --filter @growth-os/shared test:coverage`，四份报告均无资产/d.ts/barrel 条目
  - 实施修正：desktop-core 的 `preload/index.ts` 经核实是真实桥接代码（非 barrel），按 spec "入口保持度量"不套 `**/index.ts` 排除，仅排除 `src/types.ts` —— 与任务原文的差异已在配置注释中说明
- [x] 1.2 `apps/server/vitest.config.ts` 加 `src/infra/database/migrations/**`、`src/infra/database/seeders/**` 排除；验证：`pnpm --filter server test:coverage`，报告不再出现 migrations/seeders 条目
- [x] 1.3 `packages/types` 排除纯类型文件：逐文件核对候选目录（`src/adapters/**`、`src/events/**` 等，含 `src/utils/ipc-channels.ts` 是否含运行时常量）确认无运行时导出后再排除，拿不准的保留度量；验证：`pnpm --filter @growth-os/types test:coverage`，报告只含 zod schema 等运行时文件
  - 核对结论：运行时代码仅在 `src/api/{agents,audit,projects,sessions,skills}.ts` 与 `src/auth.ts`（zod schema）；`ipc-channels.ts` 纯 interface/type，已排除

## 2. 回填阈值基线

- [x] 2.1 运行 `pnpm test:coverage`，记录六包修正后的实测 lines / branches 数字（写入本任务的 PR 描述或实施记录）；验证：命令退出码 0
  - 实测（2026-09-09，口径修正后）：desktop 58.46/58.37 · server 76.24/67.30 · desktop-core 88.09/91.66 · ui 100/100 · types 21.42/100 · shared 97.70/94.11
- [x] 2.2 六包 vitest.config.ts 各自加 `coverage.thresholds`（lines + branches = 实测值整数下限），重跑 `pnpm test:coverage` 确认六个任务全绿；验证：`pnpm test:coverage` 退出码 0 且无阈值告警

## 3. CI 接入阈值门禁

- [x] 3.1 `.github/workflows/ci.yml` 将 `pnpm turbo lint typecheck test` 改为 `pnpm turbo lint typecheck test:coverage`；验证：本地等价命令 `pnpm turbo lint typecheck test:coverage` 全绿（18/18 tasks，exit 0）

## 4. 收尾验证

- [x] 4.1 按 `.agents/notes/README.md` 契约写 thin Agent Note（一句话 summary + 指向本变更的链接）；验证：note 文件存在且链接指向 `openspec/changes/trustworthy-coverage/`
- [x] 4.2 全仓验证链收口；验证：`pnpm test` → `pnpm typecheck` → `pnpm lint` → `pnpm verify` 依次全绿（test/typecheck/lint 各 6/6 successful，invariants/docs/gates OK）
