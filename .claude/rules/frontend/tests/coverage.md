---
alwaysApply: false
description: Test coverage principles (Vitest): test behavior, not implementation; core logic covers normal/error/boundary branches; shared-logic changes and bug fixes add tests in the same pass; UI shells may be untested. Use when deciding what to test.
---

# Coverage Principles

**When to use**: deciding which code should be tested; whether to add tests after changing code.

**Key points**:

1. Test behavior, not implementation details: assert inputs/outputs and side effects (storage, navigation, toast), don't lock in internal call order or private variable names.
2. Core logic covers at least three paths: normal (success path), error (reject/throw), boundary (empty, zero, extreme durations) — e.g. a timer tests "auto-removes after 3s / duration=0 persists / manual removal".
3. Changes to shared behavior, composables, route guards, or IPC type contracts must add/update tests in the same pass; pure UI shell pages (e.g. dashboard placeholder) may be untested.
4. Assert async logic with `resolves/rejects`, never swallow failures with bare try/catch.
5. A new composable ships with a companion unit test file (`use-*.test.ts`) in the same commit, not deferred.

**Example**:

```ts
// One case covers one path, with clear semantics:
it("duration=0 persists, never auto-removes", () => {
  /* ... */
});
it("auto-removes after the default 3s", () => {
  /* ... */
});
```

**Verification**:

```bash
pnpm test
# cases grow with the source: a new composable must come with a same-named unit test file
```
