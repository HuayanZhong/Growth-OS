# @growth-os/shared

English | [中文](README.zh.md)

Zero-dependency (except `zod`) cross-package utilities: env validation and URL normalization.

## Exports

| Module             | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| `src/env.ts`       | Env validation helpers (shared by server and desktop) |
| `src/normalize.ts` | URL normalization helpers                             |

## Usage

```ts
import { normalizeUrl } from "@growth-os/shared";
```

## Contract

- Keep this package dependency-free beyond `zod`; it is the leaf used by both `apps/server` and `apps/desktop`.
- Behavior changes here ripple across the repo — run the repo verification suite (`pnpm test` / `typecheck` / `lint`) before shipping.
