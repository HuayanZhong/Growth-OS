---
alwaysApply: false
description: Timeout rule (NestJS + rxjs): 30s default; @SkipTimeout for SSE/streaming; TimeoutInterceptor uses rxjs timeout operator; AllExceptionsFilter converts TimeoutError to 408 + TIMEOUT code. Use when adding long-running endpoints or modifying timeout behavior.
---

# Request Timeout (TimeoutInterceptor)

**When to use**: when adding long-running endpoints (SSE, file upload, LLM streaming) or modifying timeout behavior.

**Key points**:

1. **Default timeout 30s**: covers绝大多数 REST endpoints. Timeout is a constant (`DEFAULT_TIMEOUT_MS`), not configurable per-request.
2. **`@SkipTimeout()` decorator**: marks endpoints that should not be timed out (SSE streaming, file upload). The decorator is in `src/common/decorators/skip-timeout.decorator.ts`.
3. **How it works**: `TimeoutInterceptor` checks `Reflector` for `SKIP_TIMEOUT` metadata → if present, returns `next.handle()` unchanged → otherwise applies rxjs `timeout(30_000)` operator. Timeout triggers `TimeoutError` → caught by `catchError` → throws `RequestTimeoutException` → `AllExceptionsFilter` maps to `{ code: 'TIMEOUT', message: '请求超时...' }`.
4. **SSE exemption**: SSE endpoints (`/ai/chat`) stream responses for minutes. A fixed timeout would kill them mid-stream. Always mark SSE controllers with `@SkipTimeout()`.
5. **Registration**: `TimeoutInterceptor` is registered as `APP_INTERCEPTOR` in `AppModule` (global). It wraps inside `ResponseEnvelopeInterceptor` (timeout fires before envelope wrapping).

**Example**:

```ts
@SkipTimeout()
@Post('chat')
chat(@Body() dto: ChatDto, @Res() res: Response) {
  // SSE stream can run for minutes
  res.setHeader('Content-Type', 'text/event-stream')
  // ...
}
```

**Verification**:

```bash
# Non-SSE endpoint: timeout after 30s
# SSE endpoint: no timeout
rg -n '@SkipTimeout' apps/server/src
# All SSE endpoints are marked
```
