---
alwaysApply: false
description: Request validation (NestJS + zod): schemas in @growth-os/types as createXxxSchema + z.infer; ZodValidationPipe on every @Body/@Query; query numbers via z.coerce. Use when adding endpoints, input schemas, or validation.
---

# Request Validation (Zod schemas + ZodValidationPipe)

**When to use**: when adding or modifying HTTP endpoints, input schemas, or validation behavior.

**Key points**:

1. **Schemas live in `@growth-os/types`**: each domain file exports `createXxxSchema` (+ `updateXxxSchema = createXxxSchema.partial()` where applicable) alongside its `z.infer` type. Schemas are the contract — frontend forms and IPC can reuse them; never hand-write a duplicate input type.
2. **Controllers mount the pipe**: every `@Body(...)` and `@Query(...)` carries `new ZodValidationPipe(xxxSchema)`. The `verify-invariants` gate enforces this; legitimate raw-body endpoints (e.g. multipart uploads) are exempted with a `// invariant: skip` comment plus the reason.
3. **Query params are strings**: numeric query fields use `z.coerce.number()` (with `.int()`, bounds) in the schema — the pipe receives raw strings.
4. **Error contract**: on failure the pipe throws `BadRequestException` and `AllExceptionsFilter` normalizes it to `{ code: 'VALIDATION_ERROR', message, details: [{ path, message }] }` — no extra mapping needed.
5. **Schema-first, service-trust**: validation happens at the HTTP boundary; services trust already-validated input and never re-validate the same shape. Internal calls (service → service) do not go through the pipe.

**Example**:

```ts
// packages/types/src/api/audit.ts
export const auditLogQuerySchema = z.object({
  from: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>

// apps/server/src/modules/audit/audit.controller.ts
@Get()
list(@Query(new ZodValidationPipe(auditLogQuerySchema)) query: AuditLogQuery) { ... }
```

**Verification**:

```bash
pnpm verify:invariants
# every @Body/@Query carries ZodValidationPipe (or a skip exemption)
```
