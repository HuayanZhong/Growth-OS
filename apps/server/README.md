# server — NestJS backend + MikroORM

English | [中文](README.zh.md)

The Growth OS backend: NestJS + MikroORM (Supabase PostgreSQL, session pooler). Database & ORM workflow is documented in [docs/server/database.md](../../docs/server/database.md).

## Run

```bash
cd apps/server
pnpm dev              # nest start --watch (compiles to dist, runs via node)
pnpm build            # nest build
pnpm start:prod       # node dist/src/main.js
```

## Layout

```
src/
├── common/           # cross-module (decorators / filters / interceptors)
├── config/           # env.validation.ts (ConfigModule validation)
├── infra/            # infrastructure layer
│   └── database/     # migrations/ + seeders/
├── modules/          # business modules (auth / agent / chat); entities in <module>/entities/
├── shared/types/     # cross-domain shared types
└── utils/            # generic helpers
mikro-orm.config.ts   # MikroORM config (clientUrl, TsMorph, migration/seeder paths)
```

## Database commands

The MikroORM CLI is wrapped (root env injected automatically):

- `pnpm mikro-orm:debug` — config/connection/entity diagnostics
- `pnpm mikro-orm:migration:create` / `migration:up` / `migration:down` — migrations
- `pnpm mikro-orm:seeder:run` — seeders

## Dependencies

`@growth-os/shared` (env/URL utilities). Env vars (`DATABASE_URL`, …) live only in the root `.env`, injected via dotenv-cli cascade.
