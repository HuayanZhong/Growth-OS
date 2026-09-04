---
alwaysApply: false
description: Auth flow rule (Supabase Auth + Nuxt 4): login errors map via mapAuthError; null session after sign-up → confirmation view; expired/missing session → local signOut only; 403 degrades locally. Use for login/sign-up/sign-out flows.
---

# Auth Flows (Login / Sign-up / Sign-out)

**When to use**: when writing or modifying login, sign-up, or sign-out logic.

## Login

**Key points**:

1. `signIn(email, password)`; errors uniformly map through `mapAuthError(error)` into Chinese copy for display.
2. Field-level validation (zod) is enforced before submit; failed validation skips the request; the submit button is disabled while submitting to prevent duplicates.

## Sign-up

**Key points**:

1. Confirm email is on: `signUp` returns `data.session === null` → show the "confirmation email sent" view, resend via `resendConfirmation(email)`.
2. If the session is non-null (Confirm email off) → redirect straight to the dashboard.
3. On network/server errors `signUp` may throw (e.g. `AuthRetryableFetchError`); catch and surface a message so failures never silently pass.

## Sign-out: never hit the server logout when the session is expired/missing

**Key points**:

1. Call `getSession()` before signing out: session is null or `expires_at` has passed (`Date.now() / 1000 >= session.expires_at`) → call `signOut({ scope: 'local' })` directly, **no server request** — the server-side session is already invalid and the request would 403.
2. Only call `signOut()` when the session is valid; on `session_not_found` (403) or network error → degrade to `signOut({ scope: 'local' })` to clear locally, never throw.
3. `signOutWithFallback` wraps the three-way fallback (no/expired session, API error, network error) and returns `{ errorMessage?: string }`; UI failure messages come from the API response (`mapAuthError`), success copy is custom (toast type: warning on failure, success on success).
4. Root cause reminder: disk-persisted sessions (Electron via secureStorage encrypted storage, survives restarts) mean the token can expire while the UI still shows "logged in" — sign-out then always 403s, a frequent desktop scenario. Token persistence and expiry details: [token.md](token.md).

**Example**:

```ts
signOutWithFallback = async (): Promise<{ errorMessage?: string }> => {
  const { data } = await this.supabase.auth.getSession();
  const session = data.session;
  if (!session || (session.expires_at != null && Date.now() / 1000 >= session.expires_at)) {
    await this.forceSignOut();
    return { errorMessage: "Session expired or missing" };
  }
  try {
    const { error } = await this.signOut();
    if (error) {
      await this.forceSignOut();
      return { errorMessage: mapAuthError(error) };
    }
    return {};
  } catch (err) {
    await this.forceSignOut();
    return { errorMessage: err instanceof Error ? err.message : "Network error, local session cleared" };
  }
};
```

**Verification**:

1. Tests cover the branches: no session / expired / valid / 403 degrade / network error (see `apps/desktop/test/nuxt/use-auth.test.ts`).
2. `pnpm --filter desktop test`, `pnpm --filter desktop typecheck`, `pnpm --filter desktop lint` all pass.
