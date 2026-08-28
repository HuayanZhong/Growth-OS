---
alwaysApply: false
description: Backend test structure rule (Vitest + NestJS): src/**/*.spec.ts for unit tests co-located with source; test/*.e2e-spec.ts for e2e tests; kebab-case files; one spec per module. Use when adding test files or choosing a directory.
---

# Test Directory Structure

**When to use**: adding new test files, deciding which directory a test belongs in.

**Key points**:

1. **Unit tests**: `src/**/*.spec.ts`, co-located with the module under test. Naming: `<module>.spec.ts` (e.g. `health.service.spec.ts`, `timeout.interceptor.spec.ts`).
2. **E2E tests**: `test/*.e2e-spec.ts`. Tests the full HTTP stack (controller → guard → interceptor → filter) with `supertest`. Uses `createE2EApp()` from `test/e2e-app.ts`.
3. **Configuration**: centralized in `apps/server/vitest.config.ts` (unit) + `apps/server/vitest.e2e.config.ts` (e2e; SWC plugin emits decorator metadata for Nest DI). Sub-modules don't scatter their own config.
4. **Test file naming**: kebab-case, named after the module: `JwtVerifierService` → `jwt-verifier.service.spec.ts`; `TimeoutInterceptor` → `timeout.interceptor.spec.ts`.
5. **One spec per module**: each source file has exactly one same-named spec file. Don't create additional spec variants.

**Example**:

```text
apps/server/src/
├── modules/
│   └── health/
│       ├── health.service.ts
│       └── health.service.spec.ts          # unit test
├── common/
│   └── interceptors/
│       ├── timeout.interceptor.ts
│       └── timeout.interceptor.spec.ts     # unit test
└── ...
apps/server/test/
├── e2e-app.ts                              # e2e module setup
├── health.e2e-spec.ts                      # e2e test
└── auth-me.e2e-spec.ts                     # e2e test
```

**Verification**:

```bash
ls apps/server/src/**/*.spec.ts
# Every module has a co-located spec
```
