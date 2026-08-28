---
alwaysApply: false
description: Backend mock strategy rule (Vitest): never call real services (Supabase, DB); mock ESM-only modules with vi.mock; cover success + error paths; use vi.useFakeTimers for timer-dependent code. Use when writing tests or mocking dependencies.
---

# Mock Strategy

**When to use**: when writing tests that involve external services, ESM-only modules, or timers.

**Key points**:

1. **Never call real services**: Supabase network requests, DB connections, and IPC are all mocked. Tests don't depend on the internet, real databases, or Electron.
2. **ESM-only module mocking**: Vitest loads ESM packages natively (no CJS interop issues), and modules are still mocked in tests. Mock with `vi.mock('@mikro-orm/nestjs', () => ({ InjectMikroORM: () => () => {} }))`. The `vi.mock` call is hoisted to the top of the file, same as `jest.mock` was.
3. **Timer mocking**: use `vi.useFakeTimers()` in `beforeEach` and `vi.useRealTimers()` in `afterEach`. Advance with `vi.advanceTimersByTime(ms)`. Use for timeout tests, health probe timeouts, and any time-dependent logic.
4. **Mock factory pattern**: create helper functions like `createOrmMock(executeFn)` that return typed mock objects. Use `as unknown as MikroORM` to satisfy TypeScript.
5. **Cover both paths**: every mock should test success AND error/reject paths. Verify that errors are handled gracefully (no unhandled rejections, correct error codes).
6. **Timer cleanup verification**: when testing timeout logic, verify that `clearTimeout` is called on success paths (no timer leaks).

**Example**:

```ts
// vi.mock is hoisted above imports, same semantics as jest.mock
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MikroORM } from '@mikro-orm/core'
import { HealthService } from './health.service.ts'

vi.mock('@mikro-orm/nestjs', () => ({
  InjectMikroORM: () => () => {},
}))

function createOrmMock(executeFn: () => Promise<unknown>) {
  return {
    em: { getConnection: () => ({ execute: executeFn }) },
  } as unknown as MikroORM
}

describe('HealthService', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('DB ping timeout after 5s', async () => {
    const orm = createOrmMock(() => new Promise<never>(() => {}))
    const service = new HealthService(orm)
    const promise = service.checkDatabase()
    vi.advanceTimersByTime(5_000)
    expect((await promise).status).toBe('disconnected')
  })
})
```

**Verification**:

```bash
rg -n 'vi.mock\(' apps/server/src/**/*.spec.ts
# ESM mocks are at the top of files that need them
pnpm --filter server test
# All tests pass, no real service calls
```
