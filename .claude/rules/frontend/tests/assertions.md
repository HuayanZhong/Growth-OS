---
alwaysApply: false
description: Assertion & type safety rule (Vitest + TS strict): non-null assertions on array indexing (noUncheckedIndexedAccess); explicit assertions, no any; typecheck must pass. Use when fixing TS2322/TS2532/TS2554 or writing assertions.
---

# Assertions & Type Safety

**When to use**: writing assertions; when IDE/typecheck reports TS2322 (type mismatch), TS2532 (possibly undefined), TS2554 (argument count), etc.

**Key points**:

1. The project enables `noUncheckedIndexedAccess`: array/tuple indexing may be `undefined`, so use non-null assertions when taking elements: `toasts.value[0]!.id`, `mock.calls[0]![0].value`.
2. Use explicit assertions for type mismatches, never `any` or `as unknown as` chains:
   - Guard two-arg calls: `authMiddleware(to as never, {} as never)`
   - NuxtError assertions: `error as NuxtError`, `Partial<NuxtError>`
3. Semantic assertions: use `resolves/rejects` for async (`await expect(...).resolves.toBeNull()`), `toHaveBeenCalledWith(expect.not.stringContaining(...))` for mock args, over bare `toBeTruthy`.
4. Aggregate multiple assertions for one case with `toEqual`/`toMatchObject` so failures are easier to locate; don't scatter many small assertions.

**Example**:

```ts
const sent = secureStoreMock.mock.calls[0]![0].value;
expect(JSON.parse(sent).user).toEqual({ id: "u1", email: "a@b.com" });
```

**Verification**:

```bash
pnpm typecheck   # must pass after adding/modifying tests
```
