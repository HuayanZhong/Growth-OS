# server — NestJS 后端 + MikroORM

[English](README.md) | 中文

Growth OS 后端服务：NestJS + MikroORM（Supabase PostgreSQL，session pooler）。数据库与 ORM 工作流详见 [docs/server/database.md](../../docs/server/database.md)。

## 运行

```bash
cd apps/server
pnpm dev              # nest start --watch（编译到 dist 再 node 运行）
pnpm build            # nest build
pnpm start:prod       # node dist/src/main.js
```

## 测试

```bash
cd apps/server
pnpm test             # 单元测试（jest，src/**/*.spec.ts）——全 mock，无需环境变量
pnpm test:e2e         # supertest e2e（test/*.e2e-spec.ts）——需根 .env（真实 DATABASE_URL / Supabase）
```

e2e 覆盖鉴权探针（`/api/v1/health` 公开；`/api/v1/auth/me` 无 token 401 / 有真实 token 200）；缺少 `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD` 时自动跳过真实登录用例。

## 结构

```
src/
├── common/           # 跨模块通用（decorators / filters / interceptors）
├── config/           # env.validation.ts（ConfigModule 校验）
├── infra/            # 基础设施层
│   └── database/     # migrations/（迁移）+ seeders/（种子）
├── modules/          # 业务模块（auth / agent / chat），实体放 <模块>/entities/
├── shared/types/     # 跨域共享类型
└── utils/            # 通用工具
mikro-orm.config.ts   # MikroORM 配置（clientUrl、TsMorph、迁移/种子路径）
```

## 数据库命令

MikroORM CLI 已封装（自动注入根目录 env）：

- `pnpm mikro-orm:debug` — 配置/连接/实体诊断
- `pnpm mikro-orm:migration:create` / `migration:up` / `migration:down` — 迁移
- `pnpm mikro-orm:seeder:run` — 种子

## 依赖

`@growth-os/shared`（env 校验）、`@growth-os/types`（错误信封契约）、`zod`、`jose`（JWT 验证）。环境变量（`DATABASE_URL` 等）只存根 `.env`，经 dotenv-cli 级联注入。

## 鉴权

所有路由默认受全局 JWT Guard 保护，公开端点用 `@Public()` 显式豁免。Supabase Auth 签发的 token 按官方双轨姿势验证（非对称密钥走 JWKS 本地验签，legacy HS256 走 Auth 服务器探针）。设计细节：[.trae/documents/auth-verification-design.md](../../.trae/documents/auth-verification-design.md)。
