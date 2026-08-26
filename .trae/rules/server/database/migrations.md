---
alwaysApply: false
description: Migration workflow rule (MikroORM): create via pnpm mikro-orm:migration:create; up/down via scripts; never edit compiled dist/; source in src/infra/database/migrations/. Use when creating or applying migrations.
---

# Migration Workflow

**When to use**: when creating migrations, rolling back, or debugging schema issues.

**Key points**:

1. **Create**: `pnpm --filter server mikro-orm:migration:create` generates a migration file from entity vs schema diff. The file lands in `src/infra/database/migrations/` with a timestamp prefix.
2. **Apply**: `pnpm --filter server mikro-orm:migration:up` runs all pending migrations.
3. **Rollback**: `pnpm --filter server mikro-orm:migration:down` reverts the latest migration.
4. **Never edit `dist/`**: compiled output is regenerated on every build. Edit only `.ts` source files in `src/infra/database/migrations/`.
5. **Naming**: migration files are auto-named by MikroORM CLI with a timestamp prefix. Don't rename them manually — the timestamp order is used for up/down sequencing.
6. **Seeders**: `pnpm --filter server mikro-orm:seeder:run` runs the `DatabaseSeeder` from `src/infra/database/seeders/`. Seeders are for dev/test data only, never production.

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
