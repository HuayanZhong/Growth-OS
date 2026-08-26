---
alwaysApply: false
description: Backend mock strategy rule (Jest): never call real services (Supabase, DB); mock ESM-only modules with jest.mock before import; cover success + error paths; use jest.useFakeTimers for timer-dependent code. Use when writing tests or mocking dependencies.
---

# Mock Strategy

**When to use**: when writing tests that involve external services, ESM-only modules, or timers.

**Key points**:

1. **Never call real services**: Supabase network requests, DB connections, and IPC are all mocked. Tests don't depend on the internet, real databases, or Electron.
2. **ESM-only module mocking**: `@mikro-orm/nestjs` is ESM-only and Jest CJS cannot require it. Mock with `jest.mock('@mikro-orm/nestjs', () => ({ InjectMikroORM: () => () => {} }))` **before** importing the module under test. The `jest.mock` call is hoisted by Jest but must appear at the top of the file.
3. **Timer mocking**: use `jest.useFakeTimers()` in `beforeEach` and `jest.useRealTimers()` in `afterEach`. Advance with `jest.advanceTimersByTime(ms)`. Use for timeout tests, health probe timeouts, and any time-dependent logic.
4. **Mock factory pattern**: create helper functions like `createOrmMock(executeFn)` that return typed mock objects. Use `as unknown as MikroORM` to satisfy TypeScript.
5. **Cover both paths**: every mock should test success AND error/reject paths. Verify that errors are handled gracefully (no unhandled rejections, correct error codes).
6. **Timer cleanup verification**: when testing timeout logic, verify that `clearTimeout` is called on success paths (no timer leaks).

**Example**:

```ts
// ESM mock MUST come before imports
jest.mock('@mikro-orm/nestjs', () => ({
  InjectMikroORM: () => () => {},
}))

import { MikroORM } from '@mikro-orm/core'
import { HealthService } from './health.service.ts'

function createOrmMock(executeFn: () => Promise<unknown>) {
  return {
    em: { getConnection: () => ({ execute: executeFn }) },
  } as unknown as MikroORM
}

describe('HealthService', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('DB ping timeout after 5s', async () => {
    const orm = createOrmMock(() => new Promise<never>(() => {}))
    const service = new HealthService(orm)
    const promise = service.checkDatabase()
    jest.advanceTimersByTime(5_000)
    expect((await promise).status).toBe('disconnected')
  })
})
```

**Verification**:

```bash
rg -n 'jest.mock\(' apps/server/src/**/*.spec.ts
# ESM mocks are at the top of files that need them
pnpm --filter server test
# All tests pass, no real service calls
```
