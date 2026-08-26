---
alwaysApply: false
description: Response envelope rule (NestJS): successful responses wrapped as {data: T} by ResponseEnvelopeInterceptor; SSE and 204 excluded; errors go through AllExceptionsFilter, not intercepted. Use when writing controllers or testing response shapes.
---

# Response Envelope

**When to use**: when writing controller return values, testing response shapes, or debugging response format.

**Key points**:

1. **Success envelope**: `ResponseEnvelopeInterceptor` wraps all successful (2xx) responses as `{ data: T }`. The original return value becomes the `data` field.
2. **Exclusions**: 204 No Content passes through unwrapped (no body to wrap). SSE endpoints use `res.write()` directly and bypass the interceptor entirely.
3. **Error path**: exceptions are NOT intercepted — they go through `AllExceptionsFilter` and return `{ code, message, details? }`. The interceptor and filter never conflict (interceptor handles success, filter handles error).
4. **Controller contract**: controllers return the raw business object. The interceptor adds the `data` wrapper. Never manually wrap in `{ data: ... }` inside controllers.
5. **E2E tests**: must account for the envelope. `res.body.data` contains the business payload; `res.body.code` contains error info (errors are NOT wrapped).

**Example**:

```ts
// Controller
@Get('me')
getMe(@CurrentUser() user: AuthenticatedUser) {
  return { id: user.id, email: user.email }
}

// Response:
// { "data": { "id": "u1", "email": "a@b.com" } }
```

**Verification**:

```bash
rg -n 'ResponseEnvelopeInterceptor' apps/server/src/app.module.ts
# Interceptor registered globally
```
