# server — Agent Guide

App contract: NestJS backend + MikroORM (Supabase PostgreSQL).

- **Database & ORM workflow is documented** in [docs/server/database.md](../../docs/server/database.md) — config, migrations, seeders, and the `mikro-orm:*` scripts; read it before touching persistence.
- **Entity placement.** Business entities live in `src/modules/<module>/entities/`; migrations and seeders in `src/infra/database/`; cross-cutting concerns in `src/common/`; shared types in `src/shared/types/`.
- **Env validation is centralized** in `src/config/env.validation.ts`; add new env vars there and to the root `.env.example`, never hard-code values.
- **CLI needs env injection.** The `mikro-orm:*` scripts inject root `.env` via dotenv-cli; run them through the scripts, not the bare CLI.
- **Verify:** `pnpm --filter server typecheck`, then the repo suite for cross-layer changes.
