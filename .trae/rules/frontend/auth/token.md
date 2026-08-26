---
alwaysApply: false
description: Token/session rule (supabase-js + secureStorage): never touch tokens manually; persist via secureStorage with PII stripped; storage/IPC failures degrade gracefully; failed getSession counts as logged out. Use for token storage or login-state checks.
---

# Frontend Token / Session Management

**When to use**: session read/write, logged-in state checks, secure token persistence.

**Key points**:

1. **Never read/write tokens manually**: supabase-js injects the access_token into request headers and `autoRefreshToken` refreshes automatically; business code reads sessions only via `auth.getSession()` and signs out via `auth.signOut()`. Never hand-build the `Authorization` header, and never manually write/delete token keys in localStorage. Single sanctioned exception: `useApi.ts` (`apiFetch`) attaches the session access token to requests targeting our own NestJS API (`NUXT_PUBLIC_API_BASE_URL`) — Supabase's auto-injection only covers Supabase endpoints.
2. **Sessions persist through the secureStorage adapter** (`useSecureStorage.ts`):
   - Electron: persisted via `window.desktop.secureStore` IPC by the main process using safeStorage (OS-level encryption); plaintext tokens never appear in localStorage.
   - Plain browser (web preview/tests, no Electron preload): falls back to localStorage.
3. **Strip PII before persisting**: setItem trims via `trimSession` so only token fields + minimal user (id/email/avatar_url) are written to disk; full identities/app_metadata PII never lands.
4. **IPC/storage failures degrade gracefully**:
   - getItem failure returns null → treated as logged out, never blocks the app.
   - setItem failure does not block login (the in-memory session still works; only a re-login is needed after restart); auth-js storage errors throw and bubble up, so they must be caught.
5. **One-time plaintext cleanup**: `clearLegacyLocalStorageSession` runs before client creation — Electron only, clearing legacy plaintext keys (`supabase.auth.token`, `sb-<ref>-auth-token`, etc.); skipped in plain browser to avoid deleting the active session.
6. **Client config is fixed to four items**: `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`, `storage: secureStorage` (see `useSupabase.ts`).
7. **Logged-in checks go through getSession**: guards/pages use `supabase.auth.getSession()` (the client already injects secureStorage, no manual localStorage reads); a failed getSession (storage/IPC error) counts as logged out so guards don't throw and bounce navigation into an error-page loop (see `middleware/auth.global.ts`).
8. **Expiry check**: compare `session.expires_at` (seconds epoch) with `Date.now() / 1000`; an expired session counts as logged out, and sign-out skips the server (see [flows.md](flows.md)).

**Example**:

```ts
client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: secureStorage,
  },
});
```

```ts
// Guard: a failed getSession counts as logged out to avoid navigation dead loops
const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
const loggedIn = !!data.session;
```

**Verification**:

1. `rg -n 'localStorage\.(setItem|getItem|removeItem)|Authorization' apps/desktop/app` only matches secureStorage/useSupabase-related locations; no manual token read/write in business code.
2. Unit tests cover (`apps/desktop/test/unit/use-secure-storage.test.ts`): trimSession PII stripping, browser fallback, Electron IPC branch, IPC failure degradation.
3. `pnpm --filter desktop test`, `pnpm --filter desktop typecheck`, `pnpm --filter desktop lint` all pass.
