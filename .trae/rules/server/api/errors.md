---
alwaysApply: false
description: API error contract rule (NestJS + zod): all errors use ApiErrorEnvelope {code, message, details?}; code is machine-readable; AllExceptionsFilter normalizes all exceptions; 5xx hides internal details. Use when throwing errors or adding error codes.
---

# Error Contract (ApiErrorEnvelope)

**When to use**: when throwing errors, adding new error codes, or modifying exception handling.

**Key points**:

1. **Error shape**: `{ code: string; message: string; details?: unknown }`. The `code` field is machine-readable and stable — frontend uses `code` for branching, never `message`.
2. **`AllExceptionsFilter`** normalizes all exceptions: `HttpException` → its HTTP status; the error `code` comes from envelope-shaped `HttpException` responses (e.g. `{ code, message }` thrown by services and by `ZodValidationPipe`) and passes through when `typeof code/message === 'string'`; unknown exceptions → 500 + `INTERNAL_ERROR` with fixed message "服务器内部错误".
3. **STATUS_CODE_MAP** maps numeric HTTP status → default error code for plain `HttpException`s without an explicit code (`400 → BAD_REQUEST`, `401 → UNAUTHORIZED`, `408 → TIMEOUT`, `503 → SERVICE_UNAVAILABLE`, ...); unclassified statuses fall back to `HTTP_<status>`. Envelope responses keep their explicit `code` (e.g. `VALIDATION_ERROR` from `ZodValidationPipe`) without needing a map entry.
4. **5xx isolation**: internal errors never expose stack traces, SQL queries, or file paths to the client. Stack traces are logged via nestjs-pino Logger (auto-carries `req.id`).
5. **Adding new error codes**: add to `STATUS_CODE_MAP` in `all-exceptions.filter.ts` and to the `@growth-os/types` `ApiErrorEnvelope` type if needed. Keep the mapping one-to-one (status code → error code).

**Example**:

```ts
throw new UnauthorizedException({
  code: "UNAUTHORIZED",
  message: "未登录或登录已过期",
});

// Response:
// { "code": "UNAUTHORIZED", "message": "未登录或登录已过期" }
```

**Verification**:

```bash
rg -n 'STATUS_CODE_MAP|ApiErrorEnvelope' apps/server/src
# All error codes are centralized in the filter
```
