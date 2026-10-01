---
alwaysApply: false
description: Test mock strategy (Vitest): never call external services for real (Supabase network, Electron IPC); always mock/stub covering success + error paths; Electron/browser branches via window.desktop. Use when mocking dependencies.
---

# Mock Strategy

**When to use**: when tests involve network requests, Electron IPC, or browser API branches.

**Key points**:

1. External services must never be called for real: Supabase network requests and Electron IPC (`window.desktop.secureStore`) are all mocked/stubbed; tests don't depend on the internet or real logins.
2. Electron/browser branches are controlled via environment state: the presence/absence of `window.desktop` decides the `isElectron()` path; just add/remove the property, don't change source logic (see the use-supabase tests).
3. When mocking the three IPC methods (getItem/setItem/removeItem), cover both success and error (reject) paths: when the code under test has an error fallback, assert "doesn't throw and returns the default" (e.g. `resolves.toBeNull()`).
4. Assert mock args with `toHaveBeenCalledWith({ action: 'set', key, value: expect.any(String) })`, not full object literals.
5. Reset module-level singletons with `vi.resetModules()` + dynamic import, not by changing source exports.

**Example**:

```ts
secureStoreMock.mockRejectedValue(new Error("ipc down"));
await expect(secureStorage.getItem("k1")).resolves.toBeNull();
// persistence failure doesn't block the caller
await expect(secureStorage.setItem("k1", "v")).resolves.toBeUndefined();
```

**Verification**:

```bash
# No real network calls inside the test directory (no output means pass; rg exit code 1 on no match is normal)
rg -n 'fetch\(|createClient\(' apps/desktop/test
```
