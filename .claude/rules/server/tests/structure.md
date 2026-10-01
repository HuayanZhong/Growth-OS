---
alwaysApply: false
description: Backend test structure rule (Vitest + NestJS): unit tests live in test/ mirroring src/ (test/x/y.test.ts for src/x/y.ts); test/*.e2e-spec.ts for e2e tests; kebab-case files; one test per module. Use when adding test files or choosing a directory.
---

# Test Directory Structure

**When to use**: adding new test files, deciding which directory a test belongs in.

**Key points**:

1. **Unit tests**: `test/` mirrors `src/` one-to-one — `src/x/y.ts` → `test/x/y.test.ts` (repo-wide mirror convention, also used by `packages/*`). Naming: `<module>.test.ts` (e.g. `health.service.test.ts`, `timeout.interceptor.test.ts`). Never co-locate specs under `src/`.
2. **E2E tests**: `test/*.e2e-spec.ts`. Tests the full HTTP stack (controller → guard → interceptor → filter) with `supertest`. Uses `createE2EApp()` from `test/e2e-app.ts`.
3. **Configuration**: centralized in `apps/server/vitest.config.ts` (unit) + `apps/server/vitest.e2e.config.ts` (e2e; SWC plugin emits decorator metadata for Nest DI). Sub-modules don't scatter their own config.
4. **Test file naming**: kebab-case, named after the module: `JwtVerifierService` → `jwt-verifier.service.test.ts`; `TimeoutInterceptor` → `timeout.interceptor.test.ts`.
5. **One test per module**: each source file has exactly one same-named test file. Don't create additional variants.

**Example**:

```text
apps/server/src/
├── modules/
│   └── health/
│       └── health.service.ts
├── common/
│   └── interceptors/
│       └── timeout.interceptor.ts
└── ...
apps/server/test/
├── modules/
│   └── health/
│       └── health.service.test.ts          # mirrors src/modules/health/
├── common/
│   └── interceptors/
│       └── timeout.interceptor.test.ts     # mirrors src/common/interceptors/
├── e2e-app.ts                              # e2e module setup
├── health.e2e-spec.ts                      # e2e test
└── auth-me.e2e-spec.ts                     # e2e test
```

**Verification**:

```bash
ls apps/server/test/**/*.test.ts
# Every src module has a mirrored test file
```
