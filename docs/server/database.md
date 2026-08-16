# Server database & ORM

The NestJS backend maps to Supabase PostgreSQL through MikroORM. Config lives in [mikro-orm.config.ts](../../apps/server/mikro-orm.config.ts) at the `apps/server` root; source structure under `apps/server/src/`.

## Connection

`DATABASE_URL` in the root `.env` carries the full connection string (host/port/user/password/dbName), read by `clientUrl`. It must be a **session pooler** connection string (`aws-<region>.pooler.supabase.com:5432`) — see the Agent Note on connection choice for why not direct or transaction pooler.

MikroORM does not read `.env` itself; every CLI invocation injects it via `dotenv -e ../../.env -e ../../.env.development` (the `mikro-orm:*` scripts below). The NestJS runtime validates `DATABASE_URL` through `src/config/env.validation.ts`.

## Config highlights

- `metadataProvider: TsMorphMetadataProvider` — types are inferred from source/`.d.ts`, usable in production; tsconfig keeps `declaration: true` so compiled `dist` carries `.d.ts` (or run `mikro-orm cache:generate` to ship a metadata cache instead).
- `schemaGenerator.ignoreSchema` — Supabase system schemas (auth, storage, realtime, vault, ...) are excluded from schema diff/sync so `migration:create` stays clean.
- `migrations: { path: 'dist/migrations', pathTs: 'src/migrations' }` — dev/CLI runs `.ts` sources via tsx; production runs compiled `.js` from `dist`.
- `seeder: { path: 'dist/seeders', pathTs: 'src/seeders', defaultSeeder: 'DatabaseSeeder' }` — seed data via `@mikro-orm/seeder`.
- `debug: process.env.DB_DEBUG === 'true'` — SQL logging toggle.

## Source layout

```
apps/server/src/
├── common/                  # cross-module: decorators/, filters/, interceptors/
├── config/env.validation.ts # env schema (DATABASE_URL required)
├── infra/
│   ├── config/              # infra-level config (pino, ...)
│   └── database/
│       ├── migrations/      # migration .ts sources
│       └── seeders/DatabaseSeeder.ts
├── modules/                 # business modules (auth, agent, chat); entities in <module>/entities/
├── shared/types/            # cross-domain shared types
└── utils/                   # generic helpers
```

## Commands

Run from `apps/server`; each injects root env before invoking the CLI:

| Command                           | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `pnpm mikro-orm:debug`            | Config/connection/entity discovery diagnostics  |
| `pnpm mikro-orm:migration:create` | Generate a migration from entity vs schema diff |
| `pnpm mikro-orm:migration:up`     | Apply pending migrations                        |
| `pnpm mikro-orm:migration:down`   | Roll back the latest migration                  |
| `pnpm mikro-orm:seeder:run`       | Run the `DatabaseSeeder`                        |

## Entities

Entities live in `modules/<business>/entities/` and are discovered by the `entities` globs (`dist/**/*.entity.js` / `src/**/*.entity.ts`). None exist yet; discovery stays empty until the first entity is added.
