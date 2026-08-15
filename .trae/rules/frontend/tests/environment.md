---
alwaysApply: false
description: Nuxt test environment rule (@nuxt/test-utils): import mockNuxtImport from @nuxt/test-utils/runtime (main entry pulls in bun:test); for real runtimeConfig use vi.resetModules() + dynamic import. Use when mocking composables or singletons.
---

# Nuxt Test Environment

**When to use**: mocking composables in tests (useRuntimeConfig, etc.), resetting module-level singletons.

**Key points**:

1. `mockNuxtImport` is always imported from `@nuxt/test-utils/runtime`. Importing from the `@nuxt/test-utils` main entry triggers the e2e module (which contains a `bun:test` dependency) that Vite can't bundle, failing the whole suite.
2. When real values are needed (e.g. `useRuntimeConfig` with Supabase config injected from env), don't mock: `vi.resetModules()` + dynamic `import()` to reset the module cache, then grab the function, so singletons initialize under controlled state.
3. The `mockNuxtImport` declaration must come before the `import` of the mocked module (`.oxlintrc.json` exempts `test/**` from `import/first`; don't reorder source files for it).
4. Environment variables are injected from the root `.env` automatically by vitest.config.ts at startup (see [commands.md](commands.md)); don't set `NUXT_PUBLIC_*` manually in tests.

**Example**:

```ts
// Wrong: importing from the main entry triggers the e2e module
import { mockNuxtImport } from "@nuxt/test-utils";
// Correct
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
```

```ts
// Real runtimeConfig needed: skip mockNuxtImport, reset the module cache, then dynamic-import
vi.resetModules();
const { useSupabase } = await import("~/composables/useSupabase");
```

**Verification**:

```bash
pnpm test
# no "Failed Suites"; a wrong import path fails immediately at the Vite bundling stage
```
