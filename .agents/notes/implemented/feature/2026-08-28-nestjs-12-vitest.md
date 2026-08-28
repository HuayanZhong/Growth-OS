# Agent Note: server 升级 NestJS 12 并将测试栈统一到 Vitest

Status: implemented

## Problem

NestJS 12（2026-08-27 发布）将全部官方包转为 ESM。本仓库在 MikroORM v7 升级时已实证 Jest 30 的 CJS 模块注册器无法 require ESM-only 包（见 `apps/server/test/e2e-app.ts` 历史注释与 Jest 运行报错），因此 Jest 路线在 v12 下无存活路径——server 任何 spec import `@nestjs/common` 都会踩同一堵墙。同时 e2e 的 readiness 断言（真实 DB 连接路径）自 M1 起从未真正运行通过（Jest 阶段在 import 期即崩溃），生产 DB 连接从未被自动化验证覆盖。

## Decision

- server 测试栈从 Jest + ts-jest 迁移到 Vitest 4：spec 显式 `import { describe, it, expect, vi } from 'vitest'`（对齐 desktop 约定），单测与 e2e 分离为 `vitest.config.ts` / `vitest.e2e.config.ts`，共享 `tooling/test/base.ts` 基座；jest 三件套从 catalog 移除。
- e2e 引入 `unplugin-swc` + `@swc/core`：Vitest 转换器不产出 `emitDecoratorMetadata`，而 Nest DI（`createTestingModule`）依赖该元数据；单元测试手动实例化不受影响。
- `@nestjs/*` 升至 12 线（catalog `^12.0.x`）；`@mikro-orm/nestjs` 用 `7.0.3-dev.23`（peer 已声明支持 v12）。
- mikro-orm/nestjs dev 版要求显式 `contextName: 'default'`（移除了隐式回落），且 `registerRequestContext: false` 关闭 per-request EM 中间件（dev 版在 contextName 模式下向该中间件注入了未注册的 class token）。
- `@nestjs/throttler` 6.5.0 与 `nestjs-pino` 4.6.1 暂留旧版（peer 未跟进 v12），经运行时冒烟验证兼容（限流 429、请求日志、graceful shutdown 均正常）。
- `@mikro-orm/*` 核心（core/postgresql/cli/migrations/decorators/reflection/seeder）精确钉 7.1.11（升级前运行版本），避免 lockfile 重生成带来的 7.1.14 浮动混入本次变更。
- pnpm 12 的 `minimumReleaseAgeExclude` 显式豁免本次引入的 12 线新包（发布未满默认最低包龄）。

## Alternatives considered

- **保留 Jest 升级 v12**：拒绝。Jest runtime 无法加载 ESM-only 的 `@mikro-orm/nestjs` 与 v12 的 `@nestjs/*`，单测与 e2e 都会在 import 期崩溃；无配置级 workaround。
- **等待 throttler / nestjs-pino / mikro-orm stable 发版后再升级**：拒绝。四个包中两个已有 v12 适配（swagger 12、config 12），mikro-orm 官方 dev 线已声明 peer 支持；throttler/pino API 面窄，运行时冒烟已证兼容。等待不产生额外信息，只延迟。
- **使用 `nest upgrade` CLI 迁移**：拒绝。版本集中管理在 pnpm catalog，CLI 面向单项目 package.json，catalog 手工编辑更可控且可审查。
- **e2e 继续 stub 整个 MikroORM 模块**：拒绝。本次已能让 e2e 真实装配运行（ORM token 提供全局桩 + 真实 LoggerModule），保留 stub 会让 readiness 503 断言失去与生产路径的对应关系。
- **`@mikro-orm/*` 浮动到 7.1.14**：拒绝（当前）。lockfile 重生成时浮动引入 `con.connect is not a function` 连接层问题（与本次升级无关，属 7.1.14 行为变化叠加 v6 形态的 `driverOptions.connection` 配置）；钉回 7.1.11 保持最小变更，根因修复（`driverOptions.statement_timeout` 顶层形态）已落地，上游确认后可浮回。

## Consequences

- server 与 desktop 测试栈统一为 Vitest，`pnpm test`（turbo）跑全仓；单文件过滤命令变为 `pnpm --filter server exec vitest run <path>`。
- e2e 的 `Test.createTestingModule` 依赖 `unplugin-swc` 产出装饰器元数据；单测配置不挂 SWC 插件。
- 生产 readiness 首次具备真实验证路径（v12 下实测 `db: connected`）。
- 遗留（后续跟随，不阻塞）：
  - `@nestjs/throttler` / `nestjs-pino` 发 v12 兼容版后升级，并移除 `pnpm-workspace.yaml` 中对应豁免与依赖钉版说明；
  - `@mikro-orm/nestjs` stable 发布后从 dev.23 转正；`registerRequestContext` 与 `discovery.warnWhenNoEntities` 在 M2 实体落地时复评移除；
  - Vitest 启动时有 Vite `configLoader: 'native'` 警告（server 为 CJS 包，不能加 `"type": "module"`），上游默认切换前无害；
  - nestjs-pino 的 `/api/*` 通配路由触发 v12 `LegacyRouteConverter` 自动转换警告，等待 nestjs-pino 兼容版消除。
