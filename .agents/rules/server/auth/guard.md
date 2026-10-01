---
alwaysApply: false
description: Auth guard rule (NestJS + Supabase): all routes require Bearer token by default; @Public() exempts from JWT; @CurrentUser extracts user; failed getSession counts as logged out. Use for route protection or user context.
---

# Auth Guard (SupabaseJwtGuard)

**When to use**: when adding new routes, modifying guard behavior, or accessing the current user.

**Key points**:

1. **Default deny**: all routes require a valid Bearer token. `SupabaseJwtGuard` is registered as `APP_GUARD` in `AppModule`; every route is protected unless explicitly豁免.
2. **`@Public()`豁免**: routes marked `@Public()` skip JWT verification entirely. Use for health probes, public API endpoints, and webhook receivers. The decorator is in `src/common/decorators/public.decorator.ts`.
3. **`@CurrentUser()` user extraction**: after guard passes, the authenticated user is available via `@CurrentUser() user: AuthenticatedUser`. The decorator reads from `request.user` (set by the guard).
4. **`AuthenticatedUser` shape**: `{ id: string; email?: string; role: string }`. The `id` is always `sub` from the JWT payload; `email` is optional (some tokens don't include it); `role` defaults to `'authenticated'`.
5. **Guard order**: ThrottlerGuard runs before SupabaseJwtGuard (rate limit → auth → handler). Never reverse this order.

**Example**:

```ts
@Public()
@Get('health/liveness')
liveness() { return { status: 'ok' } }

@Get('me')
getMe(@CurrentUser() user: AuthenticatedUser) {
  return { id: user.id, email: user.email }
}
```

**Verification**:

```bash
rg -n '@Public|@CurrentUser|SupabaseJwtGuard' apps/server/src
# All public routes are explicitly marked; no unprotected sensitive endpoints
```
