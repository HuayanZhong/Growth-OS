---
alwaysApply: false
description: Backend test commands rule (pnpm + Vitest): pnpm --filter server test for unit; test:e2e for e2e; verification order: test → typecheck → lint; CI skips env validation. Use when running tests or verifying before commits.
---

# Test Commands & Verification

**When to use**: running tests, full verification before committing.

**Key points**:

1. **Unit tests**: `pnpm --filter server test` (vitest run, matches `src/**/*.spec.ts`).
2. **E2E tests**: `pnpm --filter server test:e2e` (requires Supabase connection; CI skips via `describe.skip` when env vars missing).
3. **Typecheck**: `pnpm --filter server typecheck` (tsc --noEmit).
4. **Lint**: `pnpm --filter server lint` (oxlint --fix).
5. **Verification order**: `pnpm --filter server test` → `typecheck` → `lint`. All three must pass before committing.
6. **Full repo**: `pnpm test` (turbo runs all packages in parallel). Server OOM may occur when run alongside desktop tests — run `pnpm --filter server test` standalone if needed.
7. **CI env**: `process.env.CI === 'true'` skips env validation (`validate()` returns config unchanged). Test accounts (`SUPABASE_TEST_EMAIL`, `SUPABASE_TEST_PASSWORD`) are in root `.env`, injected into `test:e2e` via dotenv-cli.

**Example**:

```bash
# Single module test
pnpm --filter server exec vitest run src/modules/health

# Full verification
pnpm --filter server test; if ($?) { pnpm --filter server typecheck }; if ($?) { pnpm --filter server lint }
```

**Verification**:

```bash
pnpm --filter server test
# All specs pass (no "FAIL" in output)
pnpm --filter server typecheck
# No type errors
pnpm --filter server lint
# No warnings or errors
```
