# apps — Application layer

English | [中文](README.zh.md)

The runnable applications of Growth OS, built on the packages in `packages/` and the shared config in `tooling/`.

## Apps

| App                          | Role                                            | Entry                                     |
| ---------------------------- | ----------------------------------------------- | ----------------------------------------- |
| [desktop](desktop/README.md) | Nuxt 4 frontend + Electron shell (UI layer)     | `pnpm dev` / `pnpm start:prod`            |
| [server](server/README.md)   | NestJS backend + MikroORM (Supabase PostgreSQL) | `pnpm --filter server dev` / `start:prod` |

## Dependency direction

- Apps depend on `packages/*` (leaf libraries), never the reverse.
- `desktop` and `server` do not depend on each other; they share contracts only through `@growth-os/shared` and `@growth-os/types`.
- All env vars live in the root `.env` and are injected per app via the dotenv-cli cascade — see the root [AGENTS.md](../AGENTS.md).

## Conventions

- Each app ships README (bilingual) + AGENTS.md + CLAUDE.md; changing an app's behavior updates its README in the same change.
- Verification is per app: `pnpm --filter desktop test` / `pnpm --filter server typecheck`, then the repo suite for cross-layer changes.
