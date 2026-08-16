# tooling — Agent Guide

Shared tool configs (TypeScript / lint / format / test). Not a package — consumed via `extends` and CLI flags.

- **Changes are cross-layer.** Every package and app inherits these configs; a change here runs the repo suite (`pnpm typecheck` → `lint` → `format`) and ships an Agent Note (root [AGENTS.md](../AGENTS.md)).
- **Prefer shared over overrides.** Add a per-package `tsconfig`/oxlint/oxfmt override only with a written reason; otherwise extend the shared file.
- **TypeScript layout is documented** at [docs/architecture/typescript-config.md](../docs/architecture/typescript-config.md) — update that detail doc when the config tree moves.
