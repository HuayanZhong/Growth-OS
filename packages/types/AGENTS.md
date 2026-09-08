# @growth-os/types — Agent Guide

Package contract: repo-wide shared types, zod schemas, and the typed IPC channel contract.

- **Contract source of truth.** Ships TypeScript types AND their zod schemas (`createXxxSchema` + `z.infer` pairs). Schemas are runtime values — no logic beyond schema definitions, no side effects.
- **HTTP input schemas live here.** Domain input schemas are mounted by server controllers (`ZodValidationPipe`) and designed for frontend reuse; a schema change is a behavior change, not a cosmetic edit.
- **IPC channels are authoritative here.** `src/utils/ipc-channels.ts` is consumed by both `packages/desktop-core` and `apps/desktop`; renaming or changing a channel is a cross-package change — search and update all consumers (see the search rules in the user guidelines) in the same change.
