# Server database & ORM

The NestJS backend maps to Supabase PostgreSQL through MikroORM. Config lives in [mikro-orm.config.ts](../../apps/server/mikro-orm.config.ts) at the `apps/server` root; source structure under `apps/server/src/`.

## Connection

`DATABASE_URL` in the root `.env` carries the full connection string (host/port/user/password/dbName), read by `clientUrl`. It must be a **session pooler** connection string (`aws-<region>.pooler.supabase.com:5432`) — see the Agent Note on connection choice for why not direct or transaction pooler.

MikroORM does not read `.env` itself; every CLI invocation injects it via `dotenv -e ../../.env -e ../../.env.development` (the `mikro-orm:*` scripts below). The NestJS runtime validates `DATABASE_URL` through `src/config/env.validation.ts`.

## Config highlights

- `metadataProvider: TsMorphMetadataProvider` — types are inferred from source/`.d.ts`, usable in production; tsconfig keeps `declaration: true` so compiled `dist` carries `.d.ts` (or run `mikro-orm cache:generate` to ship a metadata cache instead).
- `schemaGenerator.ignoreSchema` — Supabase system schemas (auth, storage, realtime, vault, ...) are excluded from schema diff/sync so `migration:create` stays clean.
- `schemaGenerator.ignoreTriggers / ignoreRoutines` — Supabase-managed routines/triggers (e.g. `public.rls_auto_enable`) are create-only for the schema generator, so `migration:create` never emits drops for objects Supabase owns.
- `migrations: { path: 'dist/infra/database/migrations', pathTs: 'src/infra/database/migrations' }` — dev/CLI runs `.ts` sources via tsx; production runs compiled `.js` from `dist`.
- `contextName: 'default'` — a named ORM context; every `MikroOrmModule.forFeature(...)` call in `modules/*/` must repeat the same name, or repository providers inject the wrong EntityManager token and the app fails at boot.
- `seeder: { path: 'dist/infra/database/seeders', pathTs: 'src/infra/database/seeders', defaultSeeder: 'DatabaseSeeder' }` — seed data via `@mikro-orm/seeder`.
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

Entities live in `modules/<business>/entities/` and are discovered by the `entities` globs (`dist/**/*.entity.js` / `src/**/*.entity.ts`). Current tables:

- `sessions` module: `SessionEventEntity` ([session-event.entity.ts](../../apps/server/src/modules/sessions/entities/session-event.entity.ts)) — the append-only `session_events` event log; `SessionRecordEntity` ([session-record.entity.ts](../../apps/server/src/modules/sessions/entities/session-record.entity.ts)) — `session_records` lifecycle metadata. `session_events.session_id` carries no FK; the service cascades event deletion in the same transaction that removes the record.
- `agents` / `skills` / `projects` modules: one table each (`agents`, `skills`, `projects`); id-reference lists (`toolIds`, `agentIds`, ...) are stored as `jsonb` — members remain owned by their own domain.
- `audit` module: `AuditLogEntity` ([audit-log.entity.ts](../../apps/server/src/modules/audit/entities/audit-log.entity.ts)) — the append-only `audit_logs` table recording server-side write operations (actor/action/resource).
