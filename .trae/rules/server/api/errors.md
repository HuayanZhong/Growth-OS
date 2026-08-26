---
alwaysApply: false
description: API error contract rule (NestJS + zod): all errors use ApiErrorEnvelope {code, message, details?}; code is machine-readable; AllExceptionsFilter normalizes all exceptions; 5xx hides internal details. Use when throwing errors or adding error codes.
---

# Error Contract (ApiErrorEnvelope)

**When to use**: when throwing errors, adding new error codes, or modifying exception handling.

**Key points**:

1. **Error shape**: `{ code: string; message: string; details?: unknown }`. The `code` field is machine-readable and stable — frontend uses `code` for branching, never `message`.
2. **`AllExceptionsFilter`** normalizes all exceptions: `HttpException` → mapped status code + `STATUS_CODE_MAP`; envelope-shaped responses (e.g. ZodValidationPipe) pass through with type guard (`typeof code/message === 'string'`); unknown exceptions → 500 + `INTERNAL_ERROR` with fixed message "服务器内部错误".
3. **STATUS_CODE_MAP**: `BAD_REQUEST` → `BAD_REQUEST`, `UNAUTHORIZED` → `UNAUTHORIZED`, `REQUEST_TIMEOUT` → `TIMEOUT`, `SERVICE_UNAVAILABLE` → `SERVICE_UNAVAILABLE`, etc. Unclassified codes become `HTTP_<status>`.
4. **5xx isolation**: internal errors never expose stack traces, SQL queries, or file paths to the client. Stack traces are logged via nestjs-pino Logger (auto-carries `req.id`).
5. **Adding new error codes**: add to `STATUS_CODE_MAP` in `all-exceptions.filter.ts` and to the `@growth-os/types` `ApiErrorEnvelope` type if needed. Keep the mapping one-to-one (status code → error code).

**Example**:

```ts
throw new UnauthorizedException({
  code: 'UNAUTHORIZED',
  message: '未登录或登录已过期',
})

// Response:
// { "code": "UNAUTHORIZED", "message": "未登录或登录已过期" }
```

**Verification**:

```bash
rg -n 'STATUS_CODE_MAP|ApiErrorEnvelope' apps/server/src
# All error codes are centralized in the filter
```
