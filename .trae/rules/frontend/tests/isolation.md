---
alwaysApply: false
description: Test isolation rule (Vitest): beforeEach resets shared state (localStorage, singletons, mocks); timers use vi.useFakeTimers + advance, restored in afterEach; cases must not depend on each other. Use for stateful or timer tests.
---

# Test Isolation

**When to use**: when tests involve module-level singletons, localStorage, setTimeout, or mock functions.

**Key points**:

1. Reset module-level singletons (client, global toasts, etc.) in `beforeEach`: `toasts.value = []`, `localStorage.clear()`; browser globals added/removed (e.g. `window.desktop`) must be restored or cleaned within the case to avoid polluting later cases.
2. Timers always use `vi.useFakeTimers()` and advance with `vi.advanceTimersByTime()`, never real `sleep`; restore with `vi.useRealTimers()` in `afterEach`.
3. Rebuild mock functions in `beforeEach` (`vi.fn()`); clean up spies with `vi.restoreAllMocks()` in `afterEach` to avoid cross-case leaks.
4. Each case is self-sufficient: it doesn't rely on state left by previous cases and doesn't assume execution order.
5. `vi.resetModules()` only affects the module cache, not real side effects (localStorage, timers) — handle the two separately.

**Example**:

```ts
beforeEach(() => {
  toasts.value = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});
```

**Verification**:

```bash
# Running a file alone vs the full suite gives identical results (isolation doesn't depend on order)
pnpm vitest run test/unit/use-toast.test.ts
```
