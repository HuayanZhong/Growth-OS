---
alwaysApply: false
description: Frontend test organization: test/unit/ node-env pure logic, test/nuxt/ Nuxt-runtime (vitest); test/e2e/ Playwright E2E (separate runner). kebab-case files named after the module. Use when adding test files or choosing a directory.
---

# Test Directory Structure

**When to use**: adding new test files, deciding which directory a test belongs in.

**Key points**:

1. **Official projects layout** (Nuxt 4.x testing docs): `test/unit/` holds pure-logic tests running in the fast node environment; `test/nuxt/` holds tests that need the Nuxt runtime (auto-imports, `mountSuspended`, `mockNuxtImport`) and is automatically included in Nuxt's TypeScript context (aliases like `~/` and `#imports` resolve there — no manual tsconfig include). `test/e2e/` holds end-to-end tests run by **Playwright** (separate runner, NOT a vitest project): web main flows under `test/e2e/web/`, Electron production-build smoke under `test/e2e/electron/`, shared guards under `test/e2e/helpers/`; config `apps/desktop/playwright.config.ts` (Chromium only), run via `pnpm --filter desktop test:e2e`. Tests do NOT mirror `app/` paths. (The repo-wide mirror convention applies to `packages/*` and `apps/server` only.)
2. **Environment is decided by directory + project**, not file name: `vitest.config.ts` defines two projects — `unit` (`test/unit/*.{test,spec}.ts`, `environment: 'node'`) and `nuxt` (`test/nuxt/*.{test,spec}.ts`, Nuxt environment via `defineVitestProject`). A test's location tells you its environment.
3. **Never put Nuxt-dependent tests in `test/unit/`**: unit tests must not rely on Nuxt runtime features (auto-imports like `ref`, composables requiring `nuxtApp`). Anything importing composables with auto-imports or mounting SFCs goes to `test/nuxt/`. Only truly standalone logic (plain utils with explicit imports) belongs in `test/unit/`.
4. Files are flat under their bucket, kebab-case, named after the module or behavior under test: `use-auth.test.ts`, `auth-login.test.ts`, `auth-middleware.test.ts`. Adding tests to an existing module edits the same-named file, no new variants.
5. Run a single project: `pnpm vitest run --project nuxt` / `--project unit`. Configuration lives only in `apps/desktop/vitest.config.ts`.
6. E2E credentials are injected via the `test:e2e` dotenv chain (`SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD`); missing credentials skip affected cases without failing the run.

**Example**:

```text
apps/desktop/test/
├── unit/                       # node environment — no Nuxt runtime features
│   └── (empty today; e.g. utils.test.ts later)
├── nuxt/                       # Nuxt runtime environment
│   ├── auth-login.test.ts      # mounts ~/components/auth/login.vue
│   ├── auth-middleware.test.ts # middleware/auth.global
│   ├── auth-page.test.ts       # mounts ~/pages/auth/index.vue
│   ├── auth-register.test.ts   # mounts ~/components/auth/register.vue
│   ├── default-layout.test.ts  # mounts ~/layouts/default.vue
│   ├── error-page.test.ts      # mounts ~/error.vue
│   ├── index-redirect.test.ts  # mounts ~/pages/index.vue
│   ├── use-api.test.ts
│   ├── use-auth.test.ts
│   ├── use-secure-storage.test.ts
│   ├── use-supabase.test.ts
│   └── use-toast.test.ts
└── e2e/                        # Playwright E2E (separate runner, not vitest)
    ├── web/                    # browser-mode main flows (auth.spec.ts)
    ├── electron/               # production-build smoke (app.spec.ts)
    └── helpers/                # credentials guard etc.
```

**Verification**:

```bash
ls apps/desktop/test/nuxt
# every new Nuxt-runtime module has a same-named *.test.ts here; pure logic goes to test/unit/
```
