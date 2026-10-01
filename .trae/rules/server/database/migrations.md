---
globs: apps/server/**
alwaysApply: false
description: Migration workflow rule (MikroORM): create via pnpm mikro-orm:migration:create; up/down via scripts; never edit compiled dist/; source in src/infra/database/migrations/. Use when creating or applying migrations.
---

# Migration Workflow

**When to use**: when creating migrations, rolling back, or debugging schema issues.

**Key points**:

1. **Create**: `pnpm --filter server mikro-orm:migration:create` generates a migration file from entity vs schema diff. The file lands in `src/infra/database/migrations/` with a timestamp prefix.
2. **Apply**: `pnpm --filter server mikro-orm:migration:up` runs all pending migrations.
3. **Rollback**: `pnpm --filter server mikro-orm:migration:down` reverts the latest migration.
4. **Never edit `dist/`**: compiled output is regenerated on every build. Edit only `.ts` source files in `src/infra/database/migrations/`. Keep the CLI's timestamp naming — the order drives up/down sequencing.
5. **Hand-written extras**: Supabase's `rls_auto_enable` trigger only *enables* RLS on new tables — write policies explicitly in `up()`; cast `auth.uid()::text` when comparing against `text` user columns (bare `uuid = text` errors the migration). Seed rows (e.g. built-in agents) also go in `up()` with an idempotent guard. Domain `Seeder` classes under `src/infra/database/seeders/` (via `mikro-orm:seeder:run`) are for dev/test data only, never production.
6. **Post-apply check**: after `migration:up`, verify with `pnpm exec dotenv -e ../../.env -- mikro-orm migration:list` — every listed migration shows an `Executed at` timestamp.

**Example**:

```bash
# After adding/modifying an entity
pnpm --filter server mikro-orm:migration:create

# Apply all pending
pnpm --filter server mikro-orm:migration:up

# Rollback last
pnpm --filter server mikro-orm:migration:down
```

**Verification**:

```bash
pnpm --filter server mikro-orm:debug
# Shows connected, entities discovered, migrations status
```
