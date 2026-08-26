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

## Test

```bash
cd apps/server
pnpm test             # unit tests (jest, src/**/*.spec.ts) — fully mocked, no env needed
pnpm test:e2e         # supertest e2e (test/*.e2e-spec.ts) — needs root .env (real DATABASE_URL / Supabase)
```

E2e covers the auth probe (`/api/v1/health` public, `/api/v1/auth/me` 401 without token / 200 with a real token); real-login cases are skipped automatically when `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD` are absent.

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

`@growth-os/shared` (env validation), `@growth-os/types` (error envelope contract), `zod`, `jose` (JWT verification). Env vars (`DATABASE_URL`, …) live only in the root `.env`, injected via dotenv-cli cascade.

## Auth

All routes are protected by default via a global JWT guard; public endpoints opt out with `@Public()`. Tokens issued by Supabase Auth are verified per the official dual-track approach (JWKS local verification for asymmetric keys; Auth-server probe for legacy HS256). Design details: [.trae/documents/auth-verification-design.md](../../.trae/documents/auth-verification-design.md).
