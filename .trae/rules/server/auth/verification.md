---
alwaysApply: false
description: JWT verification rule (Supabase + jose): dual-track JWKS local + HS256 Auth server probe; clock tolerance 30s; JWKS URL cached; never expose internal errors. Use when writing or modifying JWT verification logic.
---

# JWT Verification (Dual-track)

**When to use**: when writing or modifying JWT verification, JWKS configuration, or HS256 fallback logic.

**Key points**:

1. **Two tracks, one entry**: `verify(token)` decodes the header `alg` → ES256/RS256/etc. goes to local JWKS verification (`verifyViaJwks`); HS256 goes to Auth server probe (`verifyViaAuthServer`). No other algorithms are accepted.
2. **JWKS local verification** (primary path): `createRemoteJWKSet` from `jose`; the JWKS endpoint is `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`. JWKS cache is module-level (`jwksCache` + `jwksUrl`); re-created only when `SUPABASE_URL` changes. `clockTolerance: 30` seconds handles distributed clock drift.
3. **HS256 Auth server probe** (fallback path): call `GET {SUPABASE_URL}/auth/v1/user` with `apikey: anonKey` + `Authorization: Bearer token`. If the server returns 200, the token is valid; decode payload via `decodeJwt`. If `NUXT_PUBLIC_SUPABASE_ANON_KEY` is missing, throw `UNAUTHORIZED` immediately — never skip the probe.
4. **Error handling**: all verification failures (network, decode, expired, invalid signature) throw `UnauthorizedException({ code: 'UNAUTHORIZED', message: '未登录或登录已过期' })`. Never expose internal details (JWKS fetch errors, SQL errors) to the client.
5. **`supabaseUrl()` resolution chain**: `SUPABASE_URL` → `NUXT_PUBLIC_SUPABASE_URL` → throw. Trailing slashes stripped.

**Example**:

```ts
// verify() entry point
async verify(token: string): Promise<AuthenticatedUser> {
  const alg = decodeProtectedHeader(token).alg
  if (alg === 'HS256') return this.verifyViaAuthServer(token)
  return this.verifyViaJwks(token)
}
```

**Verification**:

```bash
rg -n 'createRemoteJWKSet|verifyViaAuthServer|clockTolerance' apps/server/src
# JWKS cache and dual-track present
```
