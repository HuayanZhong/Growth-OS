# apps — 应用层

[English](README.md) | 中文

Growth OS 的可运行应用，构建在 `packages/` 的共享包和 `tooling/` 的共享配置之上。

## 应用

| 应用 | 角色 | 入口 |
| --- | --- | --- |
| [desktop](desktop/README.md) | Nuxt 4 前端 + Electron 壳（UI 层） | `pnpm dev` / `pnpm start:prod` |
| [server](server/README.md) | NestJS 后端 + MikroORM（Supabase PostgreSQL） | `pnpm --filter server dev` / `start:prod` |

## 依赖方向

- 应用依赖 `packages/*`（叶子库），不允许反向。
- `desktop` 与 `server` 互不依赖：`desktop` 依赖 `@growth-os/types`、`@growth-os/ui`、`@growth-os/desktop-core`；`server` 依赖 `@growth-os/shared`。
- 环境变量统一放根 `.env`，经 dotenv-cli 级联按应用注入——见根 [AGENTS.md](../AGENTS.md)。

## 约定

- 每个应用带 README（双文）+ AGENTS.md + CLAUDE.md；改动应用行为需同一变更更新其 README。
- 验证按应用进行：`pnpm --filter desktop test` / `pnpm --filter server typecheck`，跨层改动再跑仓库级套件。
