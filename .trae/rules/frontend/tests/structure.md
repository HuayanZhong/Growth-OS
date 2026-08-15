---
alwaysApply: false
description: Frontend test organization (Vitest + @nuxt/test-utils): test/unit for pure-logic unit tests, test/nuxt for component/guard/page integration; kebab-case files named after the module. Use when adding test files or choosing a directory.
---

# Test Directory Structure

**When to use**: adding new test files, deciding which directory a test belongs in.

**Key points**:

1. Tests split into two levels:
   - `test/unit/`: pure-logic unit tests (composables, utility functions, services). No component mounting, no Nuxt page context; only assert function inputs/outputs.
   - `test/nuxt/`: integration tests (component mounting, route guards, pages, layouts, error page). Depends on Nuxt runtime context (auto-import, useRouter, etc.).
2. Files are kebab-case + `.test.ts`, named after the module under test: `useAuth.ts` → `use-auth.test.ts`; guard `auth.global.ts` → `auth-middleware.test.ts` (describing the tested behavior).
3. Test files live only under `test/`, never mixed with source; adding tests to an existing module edits the same-named file, no new variants.
4. Configuration is centralized in `apps/desktop/vitest.config.ts` (`include: ['test/**/*.test.ts']` + the Nuxt test environment); sub-modules don't scatter their own config.

**Example**:

```text
apps/desktop/test/
├── unit/                       # pure-logic unit tests
│   ├── use-auth.test.ts
│   ├── use-secure-storage.test.ts
│   ├── use-supabase.test.ts
│   └── use-toast.test.ts
└── nuxt/                       # integration: components/guards/pages/layouts
    ├── auth-middleware.test.ts
    ├── error-page.test.ts
    ├── index-redirect.test.ts
    └── default-layout.test.ts
```

**Verification**:

```bash
ls apps/desktop/test/unit apps/desktop/test/nuxt
# every new composable/key module has a same-named *.test.ts in the matching directory
```
