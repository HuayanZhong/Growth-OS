---
alwaysApply: false
description: Test command & verification rule (pnpm + turbo): pnpm test runs directly (vitest.config auto-loads root .env); verification order is test → typecheck → lint, all green. Use when running tests or verifying before commits.
---

# Commands & Verification

**When to use**: running tests, full verification before committing.

**Key points**:

1. How to run:
   - Single app: `cd apps/desktop && pnpm test` (vitest run)
   - Specific file: `pnpm vitest run test/unit/use-auth.test.ts`
   - Whole repo: `pnpm test` at the root (turbo run test)
2. `.env` is auto-loaded from the root and injected into `process.env` by vitest.config.ts at startup; no manual `$env:` injection needed; don't rely on the turbo `globalEnv` declaration (Supabase vars are not listed there).
3. Pre-commit verification order: `pnpm test` → `pnpm typecheck` → `pnpm lint`; all three must pass.
4. typecheck covers `test/unit` (nuxt.config's `typescript.tsConfig.include` is extended); type errors inside test files themselves (e.g. TS2532) are caught — don't work around them.
5. `test/**` is exempt from `import/first` (`mockNuxtImport` must come before importing the mocked module); lint won't flag that rule there.

**Example**:

```bash
pnpm test && pnpm typecheck && pnpm lint
```

**Verification**:

```bash
cd apps/desktop && pnpm test
# passes directly, no environment variable prefix needed
```
