# 后端数据库与 ORM

NestJS 后端通过 MikroORM 映射 Supabase PostgreSQL。配置位于 `apps/server` 根目录的 [mikro-orm.config.ts](../../apps/server/mikro-orm.config.ts)，源码结构在 `apps/server/src/` 下。

## 连接

根 `.env` 的 `DATABASE_URL` 承载完整连接串（host/port/user/password/dbName），由 `clientUrl` 读取。必须使用 **session pooler** 连接串（`aws-<region>.pooler.supabase.com:5432`）——不用 direct 或 transaction pooler 的原因见连接选型的 Agent Note。

MikroORM 不自己读 `.env`；每次 CLI 调用都通过 `dotenv -e ../../.env -e ../../.env.development` 注入（见下方 `mikro-orm:*` 脚本）。NestJS 运行时通过 `src/config/env.validation.ts` 校验 `DATABASE_URL`。

## 配置要点

- `metadataProvider: TsMorphMetadataProvider` —— 类型从源码/`.d.ts` 推断，生产同样可用；tsconfig 保持 `declaration: true` 让编译产物 dist 携带 `.d.ts`（或跑 `mikro-orm cache:generate` 生成元数据缓存随产物部署）。
- `schemaGenerator.ignoreSchema` —— 排除 Supabase 系统 schema（auth、storage、realtime、vault 等），保证 `migration:create` 的 diff 干净。
- `migrations: { path: 'dist/migrations', pathTs: 'src/migrations' }` —— dev/CLI 用 tsx 跑 `.ts` 源，生产跑 dist 编译后的 `.js`。
- `seeder: { path: 'dist/seeders', pathTs: 'src/seeders', defaultSeeder: 'DatabaseSeeder' }` —— 通过 `@mikro-orm/seeder` 灌种子数据。
- `debug: process.env.DB_DEBUG === 'true'` —— SQL 日志开关。

## 源码结构

```
apps/server/src/
├── common/                  # 跨模块通用：decorators/、filters/、interceptors/
├── config/env.validation.ts # env 校验（DATABASE_URL 必填）
├── infra/
│   ├── config/              # 基础设施配置（pino 等）
│   └── database/
│       ├── migrations/      # 迁移 .ts 源
│       └── seeders/DatabaseSeeder.ts
├── modules/                 # 业务模块（auth、agent、chat）；实体放 <模块>/entities/
├── shared/types/            # 跨域共享类型
└── utils/                   # 通用工具函数
```

## 命令

在 `apps/server` 目录运行；每条命令调用 CLI 前先注入根 env：

| 命令 | 用途 |
| --- | --- |
| `pnpm mikro-orm:debug` | 配置/连接/实体发现诊断 |
| `pnpm mikro-orm:migration:create` | 根据实体与 schema 差异生成迁移 |
| `pnpm mikro-orm:migration:up` | 应用待执行迁移 |
| `pnpm mikro-orm:migration:down` | 回滚最近一次迁移 |
| `pnpm mikro-orm:seeder:run` | 运行 `DatabaseSeeder` |

## 实体

实体放在 `modules/<业务>/entities/`，由 `entities` glob 发现（`dist/**/*.entity.js` / `src/**/*.entity.ts`）。目前尚无实体，首个实体落地前 discovery 保持为空。
