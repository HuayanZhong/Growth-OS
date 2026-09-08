---
alwaysApply: false
description: Request validation rule (NestJS + zod): input schemas live in @growth-os/types as createXxxSchema + z.infer pairs; controllers mount ZodValidationPipe on every @Body/@Query; query numbers use z.coerce; violations surface as VALIDATION_ERROR envelope. Use when adding endpoints, input schemas, or validation.
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
// packages/types/src/api/sessions.ts
export const sendMessageSchema = z.object({
  content: z.string().min(1).max(32_000),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>

// apps/server/src/modules/sessions/sessions.controller.ts
@Post(':id/messages')
send(
  @Param('id') id: string,
  @Body(new ZodValidationPipe(sendMessageSchema)) input: SendMessageInput,
) { ... }
```

**Verification**:

```bash
pnpm verify:invariants
# every @Body/@Query carries ZodValidationPipe (or a skip exemption)
```
